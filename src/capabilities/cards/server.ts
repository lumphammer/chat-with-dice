import { createServerCapability } from "#/capabilities/createServerCapability";
import { cardsCommon } from "./common";

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

      const card = pickUniform(result.cards);

      sendChatMessage({
        ownerUserId: payload.ownerUserId,
        deck: { nodeId: payload.deckNodeId, name: result.deckName },
        card: { nodeId: card.nodeId, name: card.name },
      });
    },
  },
});
