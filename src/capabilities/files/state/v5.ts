import { filesStateValidatorV4, sharedItemValidatorV1 } from "./v4";
import * as z from "zod/v4";

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

export const filesStateValidatorV5 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(5),
  shares: z.array(roomShareValidatorV5),
});

// Shares cached before this version predate availability tracking. Assume they
// are fine: the owner's file store pushes the truth on the next change, and a
// stale "available" merely 403s on click, as it does today.
export const migrateStateV4ToV5 = (
  v4: z.infer<typeof filesStateValidatorV4>,
): z.infer<typeof filesStateValidatorV5> => ({
  version: 5,
  shares: v4.shares.map((share) => ({ ...share, unavailable: false })),
});
