import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { fixStringTimestampThatShouldBeEpochMs } from "#/utils/fixStringTimestampThatShouldBeEpochMs.ts";
import { versioned } from "#/utils/versioned.ts";
import { storageNodeValidator } from "#/validators/storageNodeValidator.ts";
import * as z from "zod/v4";

// oxlint-disable-next-line no-magic-numbers
const FILES_STATE_VERSION = 6 as const;

// Frozen copy of storageNodeValidator's shape as it was before the Deck bump
// (no `isDeck`). Historical versions (V4, V5) must keep validating exactly
// what was actually stored under them, so they can't follow
// storageNodeValidator's `isDeck` bump — that's what filesStateValidatorV6 and
// migrateStateV5ToV6 are for.
const storageNodeCoreFieldsV1 = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  parentFolderId: z.string().nullable(),
  createdTime: z.preprocess(fixStringTimestampThatShouldBeEpochMs, z.number()),
  deletedTime: z.number().nullable(),
  sizeBytes: z.number(),
});

const storageNodeValidatorV1 = z.discriminatedUnion("kind", [
  storageNodeCoreFieldsV1.extend({
    kind: z.literal("folder"),
  }),
  storageNodeCoreFieldsV1.extend({
    kind: z.literal("file"),
    contentType: z.string(),
    thumbnailContentType: z.string().nullable(),
    thumbnailSizeBytes: z.number().nullable(),
  }),
]);

const filesStateValidatorV1 = z.object({
  shares: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        name: z.string(),
        kind: z.literal("file"),
        nodeId: z.string(),
        userId: z.string(),
        userDisplayName: z.string(),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable().nullable(),
      }),
      z.object({
        name: z.string(),
        kind: z.literal("folder"),
        nodeId: z.string(),
        userId: z.string(),
        userDisplayName: z.string(),
      }),
    ]),
  ),
});

const coreFieldsV2Validator = z.object({
  name: z.string(),
  nodeId: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  dateShared: z.int(),
});

const filesStateValidatorV2 = z.object({
  version: z.literal(2),
  shares: z.array(
    z.discriminatedUnion("kind", [
      coreFieldsV2Validator.extend({
        kind: z.literal("file"),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable().nullable(),
      }),
      coreFieldsV2Validator.extend({
        kind: z.literal("folder"),
      }),
    ]),
  ),
});

const coreFieldsV3Validator = coreFieldsV2Validator;

const filesStateValidatorV3 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(3),
  shares: z.array(
    z.discriminatedUnion("kind", [
      coreFieldsV3Validator.extend({
        kind: z.literal("file"),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable(),
        sizeBytes: z.int(),
      }),
      coreFieldsV3Validator.extend({
        kind: z.literal("folder"),
      }),
    ]),
  ),
});

/**
 * What the owner's file store hands back when a node is shared, and what a
 * Shared Item Message carries, as it was before the Deck bump (`node` has no
 * `isDeck`). Frozen for V4/V5, which must keep validating exactly what was
 * actually stored under them.
 */
const sharedItemValidatorV1 = z.object({
  userId: z.string(),
  userDisplayName: z.string(),
  dateShared: z.preprocess(fixStringTimestampThatShouldBeEpochMs, z.number()),
  node: storageNodeValidatorV1,
});

/**
 * A share as the room caches it: the shared item plus whether it is currently
 * viewable from here, as it was before the Deck bump.
 */
const roomShareValidatorV5 = sharedItemValidatorV1.extend({
  /**
   * True once the owner has binned the node or one of its ancestors, pushed
   * here by the owner's file store. The grant itself survives — soft delete is
   * reversible — so this is not the same as being unshared, and a restore
   * flips it back.
   */
  unavailable: z.boolean(),
});

const filesStateValidatorV4 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(4),
  shares: z.array(sharedItemValidatorV1),
});

const filesStateValidatorV5 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(5),
  shares: z.array(roomShareValidatorV5),
});

/**
 * What the owner's file store hands back when a node is shared, and what a
 * Shared Item Message carries. Deliberately free of room-local state: a
 * message is a snapshot of one sharing event, so it has no business tracking
 * whether the file is still there.
 */
const sharedItemValidator = z.object({
  userId: z.string(),
  userDisplayName: z.string(),
  dateShared: z.preprocess(fixStringTimestampThatShouldBeEpochMs, z.number()),
  node: storageNodeValidator,
});

/**
 * A share as the room caches it: the shared item plus whether it is currently
 * viewable from here.
 */
const roomShareValidatorV6 = sharedItemValidator.extend({
  /**
   * True once the owner has binned the node or one of its ancestors, pushed
   * here by the owner's file store. The grant itself survives — soft delete is
   * reversible — so this is not the same as being unshared, and a restore
   * flips it back.
   */
  unavailable: z.boolean(),
});

const filesStateValidatorV6 = z.object({
  version: z.literal(FILES_STATE_VERSION),
  shares: z.array(roomShareValidatorV6),
});

const migrateStateV1ToV2 = (
  v1: z.infer<typeof filesStateValidatorV1>,
): z.infer<typeof filesStateValidatorV2> => ({
  version: 2,
  shares: v1.shares.map((s) => ({ ...s, dateShared: 0 })),
});

const migrateStateV2ToV3 = (
  v2: z.infer<typeof filesStateValidatorV2>,
): z.infer<typeof filesStateValidatorV3> => ({
  version: 3,
  shares: v2.shares.map((s) =>
    s.kind === "file" ? { ...s, sizeBytes: 0 } : s,
  ),
});

const migrateStateV3ToV4 = (
  v3: z.infer<typeof filesStateValidatorV3>,
): z.infer<typeof filesStateValidatorV4> => ({
  // oxlint-disable-next-line no-magic-numbers
  version: 4,
  shares: v3.shares.map((v3Share) => ({
    dateShared: v3Share.dateShared,
    userDisplayName: v3Share.userDisplayName,
    userId: v3Share.userId,
    node:
      v3Share.kind === "folder"
        ? {
            kind: "folder",
            version: 1,
            id: v3Share.nodeId,
            name: v3Share.name,
            parentFolderId: "",
            createdTime: 1,
            deletedTime: null,
            sizeBytes: 0,
          }
        : {
            kind: "file",
            version: 1,
            id: v3Share.nodeId,
            name: v3Share.name,
            parentFolderId: "",
            createdTime: 1,
            deletedTime: null,
            contentType: v3Share.contentType ?? "application/octet-stream",
            thumbnailContentType: v3Share.thumbnailR2Key ? "image/webp" : null,
            thumbnailSizeBytes: v3Share.thumbnailR2Key ? 1 : null,
            sizeBytes: v3Share.sizeBytes,
          },
  })),
});

// Shares cached before this version predate availability tracking. Assume they
// are fine: the owner's file store pushes the truth on the next change, and a
// stale "available" merely 403s on click, as it does today.
const migrateStateV4ToV5 = (
  v4: z.infer<typeof filesStateValidatorV4>,
): z.infer<typeof filesStateValidatorV5> => ({
  // oxlint-disable-next-line no-magic-numbers
  version: 5,
  shares: v4.shares.map((share) => ({ ...share, unavailable: false })),
});

const migrateStorageNodeV1ToV2 = (
  node: z.infer<typeof storageNodeValidatorV1>,
): z.infer<typeof storageNodeValidator> =>
  node.kind === "folder"
    ? { ...node, version: 2, isDeck: false }
    : { ...node, version: 2 };

const migrateStateV5ToV6 = (
  v5: z.infer<typeof filesStateValidatorV5>,
): z.infer<typeof filesStateValidatorV6> => ({
  version: FILES_STATE_VERSION,
  shares: v5.shares.map((share) => ({
    ...share,
    node: migrateStorageNodeV1ToV2(share.node),
  })),
});

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
