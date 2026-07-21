import { db as d1 } from "#/db";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

/**
 * List a shared Deck's live Cards for a Room, so the Cards sidebar can show how
 * many remain in a dwindling Pile (remaining = these Cards minus the Pile's
 * Discard, which the client already holds in capability state).
 *
 * This reuses the one authoritative definition of "what a Card is"
 * (`UserDataDO.getDeckCards`) rather than re-deriving it client-side, so the
 * count matches exactly what a draw would see. Authorisation mirrors the
 * cross-user path in `files/getFolderWithChildren`: the owner's store checks
 * the node is reachable from a share the Room holds.
 */
export const getDeckCards = defineAction({
  input: z.object({
    ownerUserId: z.string(),
    deckNodeId: z.string(),
    roomId: z.string(),
  }),
  handler: async ({ ownerUserId, deckNodeId, roomId }, context) => {
    const loggedInUser = context.locals.user;
    if (!loggedInUser) {
      throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const owner = await d1.query.users.findFirst({
      where: { id: ownerUserId },
    });
    if (!owner?.user_data_do_id) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Owner's user_data_do_id is not set",
      });
    }

    const ownerDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(owner.user_data_do_id),
    );

    const result = await ownerDO.getDeckCards({ nodeId: deckNodeId, roomId });
    if (result.result === "no-access") {
      throw new ActionError({ code: "FORBIDDEN", message: "Forbidden" });
    }
    if (result.result === "not-a-deck") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "That folder is not a deck",
      });
    }

    return { deckName: result.deckName, cards: result.cards };
  },
});
