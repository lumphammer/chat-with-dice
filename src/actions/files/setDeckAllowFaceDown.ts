import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

/**
 * Set whether a Deck permits Face Down draws. Owner-only: Deck configuration
 * lives in the owner's file store and travels with the Deck, so only the owner
 * (a signed-in, non-anonymous user acting on their own DO) may change it.
 */
export const setDeckAllowFaceDown = defineAction({
  input: z.object({
    nodeId: z.string(),
    allowFaceDown: z.boolean(),
  }),
  handler: async ({ nodeId, allowFaceDown }, context) => {
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
    await userDataDO.setDeckAllowFaceDown(nodeId, allowFaceDown);
  },
});
