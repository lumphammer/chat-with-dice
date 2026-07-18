import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

/**
 * Set (or clear, with `backNodeId: null`) a Deck's Common Back. Owner-only —
 * Deck configuration lives in the owner's file store. The DO rejects a back
 * that is not a ready image inside the Deck, so this action just forwards.
 */
export const setDeckCommonBack = defineAction({
  input: z.object({
    nodeId: z.string(),
    backNodeId: z.string().nullable(),
  }),
  handler: async ({ nodeId, backNodeId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }
    if (!user.userDataDOId) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "User data DO id not found",
      });
    }

    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(user.userDataDOId),
    );
    // Both validation outcomes map to BAD_REQUEST with a fixed, safe message;
    // an unexpected store failure throws out of the DO and surfaces as a generic
    // INTERNAL_SERVER_ERROR instead of being reported back as the caller's fault.
    const result = await userDataDO.setDeckCommonBack(nodeId, backNodeId);
    if (result.result === "not-a-deck") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "That folder is not a deck",
      });
    }
    if (result.result === "invalid-back") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "The common back must be a ready image in this deck",
      });
    }
  },
});
