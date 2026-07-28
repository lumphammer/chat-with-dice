import { fixStringTimestampThatShouldBeEpochMs } from "#/utils/fixStringTimestampThatShouldBeEpochMs";
import { storageNodeValidator } from "#/validators/storageNodeValidator";
import type { storageNodeValidatorV1 } from "./v4";
import type { filesStateValidatorV5 } from "./v5";
import * as z from "zod/v4";

/**
 * What the owner's file store hands back when a node is shared, and what a
 * Shared Item Message carries. Deliberately free of room-local state: a
 * message is a snapshot of one sharing event, so it has no business tracking
 * whether the file is still there.
 */
export const sharedItemValidator = z.object({
  userId: z.string(),
  userDisplayName: z.string(),
  dateShared: z.preprocess(fixStringTimestampThatShouldBeEpochMs, z.number()),
  node: storageNodeValidator,
});

/**
 * A share as the room caches it: the shared item plus whether it is currently
 * viewable from here.
 */
export const roomShareValidatorV6 = sharedItemValidator.extend({
  /**
   * True once the owner has binned the node or one of its ancestors, pushed
   * here by the owner's file store. The grant itself survives — soft delete is
   * reversible — so this is not the same as being unshared, and a restore
   * flips it back.
   */
  unavailable: z.boolean(),
});

export const filesStateValidatorV6 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(6),
  shares: z.array(roomShareValidatorV6),
});

export const migrateStorageNodeV1ToV2 = (
  node: z.infer<typeof storageNodeValidatorV1>,
): z.infer<typeof storageNodeValidator> =>
  node.kind === "folder"
    ? { ...node, version: 2, isDeck: false }
    : { ...node, version: 2 };

export const migrateStateV5ToV6 = (
  v5: z.infer<typeof filesStateValidatorV5>,
): z.infer<typeof filesStateValidatorV6> => ({
  version: 6,
  shares: v5.shares.map((share) => ({
    ...share,
    node: migrateStorageNodeV1ToV2(share.node),
  })),
});
