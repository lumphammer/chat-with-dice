import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { versioned } from "#/utils/versioned.ts";
import { sharedItemMessageDataValidatorV1 } from "./message/v1";
import {
  migrateMessageV1ToV2,
  sharedItemMessageDataValidatorV2,
} from "./message/v2";
import {
  migrateMessageV2ToV3,
  sharedItemMessageDataValidatorV3,
} from "./message/v3";
import {
  migrateMessageV3ToV4,
  sharedItemMessageDataValidatorV4,
} from "./message/v4";
import { filesStateValidatorV1 } from "./state/v1";
import { filesStateValidatorV2, migrateStateV1ToV2 } from "./state/v2";
import { filesStateValidatorV3, migrateStateV2ToV3 } from "./state/v3";
import { filesStateValidatorV4, migrateStateV3ToV4 } from "./state/v4";
import { filesStateValidatorV5, migrateStateV4ToV5 } from "./state/v5";
import {
  filesStateValidatorV6,
  migrateStateV5ToV6,
  roomShareValidatorV6,
  sharedItemValidator,
} from "./state/v6";
import * as z from "zod/v4";

export const filesStateValidator = versioned(filesStateValidatorV1)
  .then(filesStateValidatorV2, migrateStateV1ToV2)
  .then(filesStateValidatorV3, migrateStateV2ToV3)
  .then(filesStateValidatorV4, migrateStateV3ToV4)
  .then(filesStateValidatorV5, migrateStateV4ToV5)
  .then(filesStateValidatorV6, migrateStateV5ToV6)
  .build();

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
      // oxlint-disable-next-line no-magic-numbers
      version: 6 as const,
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
