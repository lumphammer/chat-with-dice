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
    try {
      await userDataDO.setDeckCommonBack(nodeId, backNodeId);
    } catch (cause) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: cause instanceof Error ? cause.message : "Could not set back",
      });
    }
  },
});
