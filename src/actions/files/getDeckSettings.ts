import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

/**
 * Read a Deck's configuration for its owner to edit: whether Face Down draws are
 * permitted and how Inverted draws are permitted, the current Common Back, and
 * the Deck's image children to pick a back from. Owner-only — this reads the
 * owner's own file store.
 */
export const getDeckSettings = defineAction({
  input: z.object({
    nodeId: z.string(),
  }),
  handler: async ({ nodeId }, context) => {
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
    const result = await userDataDO.getDeckSettings(nodeId);
    if (result.result === "not-a-deck") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "That folder is not a deck",
      });
    }
    return {
      allowFaceDown: result.allowFaceDown,
      invertedDraws: result.invertedDraws,
      commonBack: result.commonBack,
      images: result.images,
      cards: result.cards,
    };
  },
});
