import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

/**
 * Set what happens to a Card after it is drawn: go to the Discard until the Pile
 * is Reset, or return to the Deck so every Card stays drawable. Owner-only: Deck
 * configuration lives in the owner's file store and travels with the Deck, so
 * only the owner (a signed-in, non-anonymous user acting on their own DO) may
 * change it — which also means one Deck has one rule in every Room it is shared
 * with (ADR-0001 decision 6, as amended).
 */
export const setDeckDrawToDiscardPile = defineAction({
  input: z.object({
    nodeId: z.string(),
    drawToDiscardPile: z.boolean(),
  }),
  handler: async ({ nodeId, drawToDiscardPile }, context) => {
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
    const result = await userDataDO.setDeckDrawToDiscardPile(
      nodeId,
      drawToDiscardPile,
    );
    if (result.result === "not-a-deck") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "That folder is not a deck",
      });
    }
  },
});
