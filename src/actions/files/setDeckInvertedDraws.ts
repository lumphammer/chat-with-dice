import { invertedDrawsValues } from "#/schemas/invertedDraws";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

/**
 * Set whether — and how — a Deck permits Inverted draws (none, fronts only, or
 * fronts and backs). Owner-only: Deck configuration lives in the owner's file
 * store and travels with the Deck, so only the owner (a signed-in, non-anonymous
 * user acting on their own DO) may change it.
 */
export const setDeckInvertedDraws = defineAction({
  input: z.object({
    nodeId: z.string(),
    invertedDraws: z.enum(invertedDrawsValues),
  }),
  handler: async ({ nodeId, invertedDraws }, context) => {
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
    // Only the known "not a Deck" outcome becomes a client error; an unexpected
    // store failure throws out of the DO and surfaces as a generic
    // INTERNAL_SERVER_ERROR rather than being mislabelled as the caller's fault.
    const result = await userDataDO.setDeckInvertedDraws(nodeId, invertedDraws);
    if (result.result === "not-a-deck") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "That folder is not a deck",
      });
    }
  },
});
