import { createServerCapability } from "#/capabilities/createServerCapability";
import { cardsCommon, findPile } from "./common";

// The uniform draw: an index into the live Card list. Kept tiny and separate so
// the effect below reads as authorise → list → pick → announce.
function pickUniform<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const cardsServer = createServerCapability(cardsCommon, {
  actionEffects: {
    draw: async ({
      payload,
      userId,
      nodeShareManager,
      broadcaster,
      sendChatMessage,
      stateDraft,
    }) => {
      // Every draw is authorised against the owner's DO and the Card list is
      // derived live from the Deck folder's direct image children — the room's
      // own share cache is never consulted for access (see ADR-0001).
      const result = await nodeShareManager.listDeckCards({
        ownerUserId: payload.ownerUserId,
        deckNodeId: payload.deckNodeId,
      });

      if (result.result === "error") {
        broadcaster.sendErrorToUserId(userId, result.reason);
        return;
      }

      // A Deck with no Cards yet (empty folder, or every image sitting in a
      // subfolder) fails gracefully rather than throwing on an empty pick.
      if (result.cards.length === 0) {
        broadcaster.sendErrorToUserId(
          userId,
          "This deck has no cards to draw.",
        );
        return;
      }

      // The Pile's dwindle rule and Discard are room-side state. A Deck with no
      // Pile entry yet is a fresh, non-dwindling Pile.
      const pile = findPile(
        stateDraft,
        payload.ownerUserId,
        payload.deckNodeId,
      );
      const dwindling = pile !== undefined && !pile.returnCards;

      // Remaining is derived here, never stored: the live Cards minus the ones
      // already in the Discard. A discarded Card the owner has since deleted is
      // simply absent from `result.cards`, so it drops out on its own.
      let drawable = result.cards;
      if (dwindling && pile) {
        const discarded = new Set(pile.discard);
        drawable = result.cards.filter((card) => !discarded.has(card.nodeId));
        if (drawable.length === 0) {
          broadcaster.sendErrorToUserId(
            userId,
            "Every card has been drawn. Reset the pile to draw again.",
          );
          return;
        }
      }

      const card = pickUniform(drawable);

      // A dwindling Pile keeps the drawn Card out by recording it in the
      // Discard; a non-dwindling Pile leaves state untouched.
      if (dwindling && pile) {
        pile.discard.push(card.nodeId);
      }

      sendChatMessage({
        ownerUserId: payload.ownerUserId,
        deck: { nodeId: payload.deckNodeId, name: result.deckName },
        card: { nodeId: card.nodeId, name: card.name },
      });
    },
  },
});
