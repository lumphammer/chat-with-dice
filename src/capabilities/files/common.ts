import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { versioned } from "#/utils/versioned.ts";
import { filesStateValidatorV1 } from "./state/v1";
import { filesStateValidatorV2, migrateStateV1ToV2 } from "./state/v2";
import { filesStateValidatorV3, migrateStateV2ToV3 } from "./state/v3";
import {
  filesStateValidatorV4,
  migrateStateV3ToV4,
  sharedItemValidatorV1,
} from "./state/v4";
import { filesStateValidatorV5, migrateStateV4ToV5 } from "./state/v5";
import {
  filesStateValidatorV6,
  migrateStateV5ToV6,
  migrateStorageNodeV1ToV2,
  roomShareValidatorV6,
  sharedItemValidator,
} from "./state/v6";
import * as z from "zod/v4";

// oxlint-disable-next-line no-magic-numbers
const FILES_STATE_VERSION = 6 as const;

export const filesStateValidator = versioned(filesStateValidatorV1)
  .then(filesStateValidatorV2, migrateStateV1ToV2)
  .then(filesStateValidatorV3, migrateStateV2ToV3)
  .then(filesStateValidatorV4, migrateStateV3ToV4)
  .then(filesStateValidatorV5, migrateStateV4ToV5)
  .then(filesStateValidatorV6, migrateStateV5ToV6)
  .build();

const sharedItemMessageDataValidatorV1 = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    nodeId: z.string(),
    name: z.string(),
    userId: z.string(),
    userDisplayName: z.string(),
    contentType: z.string().nullable(),
    sizeBytes: z.int(),
    thumbnailR2Key: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("folder"),
    nodeId: z.string(),
    name: z.string(),
    userId: z.string(),
    userDisplayName: z.string(),
  }),
]);

const sharedItemMessageDataValidatorV2 =
  filesStateValidatorV3.shape.shares.element;

const sharedItemMessageDataValidatorV3 = sharedItemValidatorV1;

const sharedItemMessageDataValidatorV4 = sharedItemValidator;

const migrateMessageV1ToV2 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV1>,
): z.infer<typeof sharedItemMessageDataValidatorV2> => {
  if (data.kind === "file") {
    return {
      ...data,
      dateShared: 0,
      r2Key: "/some/fake/r2Key",
    };
  } else {
    return {
      ...data,
      dateShared: 0,
    };
  }
};

const migrateMessageV2ToV3 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV2>,
): z.infer<typeof sharedItemMessageDataValidatorV3> => {
  return {
    dateShared: data.dateShared,
    userDisplayName: data.userDisplayName,
    userId: data.userId,
    node:
      data.kind === "folder"
        ? {
            version: 1,
            kind: "folder",
            id: data.nodeId,
            name: data.name,
            parentFolderId: "",
            createdTime: 1,
            deletedTime: null,
            sizeBytes: 1,
          }
        : {
            version: 1,
            kind: "file",
            name: data.name,
            parentFolderId: "",
            contentType: data.contentType ?? "application/octet-stream",
            thumbnailContentType: data.thumbnailR2Key ? "image/webp" : null,
            thumbnailSizeBytes: data.thumbnailR2Key ? 1 : null,
            createdTime: 1,
            deletedTime: null,
            id: data.nodeId,
            sizeBytes: 1,
          },
  };
};

const migrateMessageV3ToV4 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV3>,
): z.infer<typeof sharedItemMessageDataValidatorV4> => ({
  ...data,
  node: migrateStorageNodeV1ToV2(data.node),
});

export const sharedItemMessageDataValidator = versioned(
  sharedItemMessageDataValidatorV1,
)
  .then(sharedItemMessageDataValidatorV2, migrateMessageV1ToV2)
  .then(sharedItemMessageDataValidatorV3, migrateMessageV2ToV3)
  .then(sharedItemMessageDataValidatorV4, migrateMessageV3ToV4)
  .build();

/**
 * One sharing event, as the owner's file store reports it and as a Shared Item
 * Message records it.
 */
export type SharedItem = z.infer<typeof sharedItemValidator>;

/** A share as the room caches it: a {@link SharedItem} plus its availability. */
export type RoomShare = z.infer<typeof roomShareValidatorV6>;

/**
 * Drop a room's cached share for `nodeId` owned by `ownerUserId`, if present.
 * Shared by the `unshareFile` and `removeShare` actions, which differ only in
 * their server-side effect, not in how the room's own record goes away.
 */
const removeCachedShare = (
  shares: { userId: string; node: { id: string } }[],
  ownerUserId: string,
  nodeId: string,
) => {
  const index = shares.findIndex(
    (share) => share.userId === ownerUserId && share.node.id === nodeId,
  );
  if (index !== -1) {
    shares.splice(index, 1);
  }
};

export const filesCommon = createCapabilityCommon({
  name: "files",
  displayName: "Files",
  visibility: "public",
  state: {
    validator: filesStateValidator,
    getInitialState: () => ({
      version: FILES_STATE_VERSION,
      shares: [],
    }),
  },
  messageDataValidator: sharedItemMessageDataValidator,
  buildActions({ createAction }) {
    return {
      shareFile: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
        }),
      }),
      renameShare: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
          ownerUserId: z.string(),
          newName: z.string(),
        }),
        pureFn: ({ stateDraft, payload }) => {
          const share = stateDraft.shares.find(
            (s) =>
              s.userId === payload.ownerUserId && s.node.id === payload.nodeId,
          );
          if (share) share.node.name = payload.newName;
        },
      }),
      unshareFile: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
          ownerUserId: z.string(),
        }),
        pureFn: ({ stateDraft, payload }) => {
          removeCachedShare(
            stateDraft.shares,
            payload.ownerUserId,
            payload.nodeId,
          );
        },
      }),
      // Room-side removal driven from the shared-items list: a room owner
      // clearing any share, or a user clearing their own, without drilling in.
      // Same room-record removal as `unshareFile`, but its effect informs the
      // owner's store best-effort rather than requiring an ack — see server.ts.
      removeShare: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
          ownerUserId: z.string(),
        }),
        pureFn: ({ stateDraft, payload }) => {
          removeCachedShare(
            stateDraft.shares,
            payload.ownerUserId,
            payload.nodeId,
          );
        },
      }),
    };
  },
});
