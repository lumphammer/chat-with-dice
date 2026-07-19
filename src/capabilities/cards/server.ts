import { createServerCapability } from "#/capabilities/createServerCapability";
import { cardsCommon, findPile } from "./common";

// The uniform draw: an index into the live Card list. Kept tiny and separate so
// the effect below reads as authorise → list → pick → announce.
function pickUniform<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// A drawn Card that has a back comes up Face Down on a fair coin, independent of
// which Card was picked.
const FACE_DOWN_PROBABILITY = 0.5;

// A drawn Card comes up Inverted on a fair coin, independent of the Card picked
// and of the Face Down coin — Inverted and Face Down are orthogonal (CONTEXT.md).
const INVERTED_PROBABILITY = 0.5;

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

      // Face Down is decided *after* the uniform pick and with a second, separate
      // random draw, so it cannot bias which Card comes up (ADR-0001 acceptance:
      // the Card is picked uniformly regardless). A Card only comes up Face Down
      // if it actually has a back and the Deck permits it — a Card with no back
      // always comes up face up, even in a Deck that permits Face Down.
      const faceDown =
        result.allowFaceDown &&
        card.back !== null &&
        Math.random() < FACE_DOWN_PROBABILITY;

      // Inverted is a third, separate random draw that rotates whichever face
      // shows (CONTEXT.md). The Deck's three-state `invertedDraws` setting gates
      // when it can happen: "none" never rotates; "fronts" rotates only a face-up
      // draw, leaving a Face Down one upright; "fronts-and-backs" can rotate any
      // draw, so a Face Down one shows its back rotated. The coin is only tossed
      // when a rotation is actually possible, so it can never bias the pick or the
      // Face Down coin that ran before it.
      const invertedAllowed =
        result.invertedDraws === "fronts-and-backs" ||
        (result.invertedDraws === "fronts" && !faceDown);
      const inverted = invertedAllowed && Math.random() < INVERTED_PROBABILITY;

      // A dwindling Pile keeps the drawn Card out by recording it in the
      // Discard; a non-dwindling Pile leaves state untouched.
      if (dwindling && pile) {
        pile.discard.push(card.nodeId);
      }

      sendChatMessage({
        ownerUserId: payload.ownerUserId,
        deck: { nodeId: payload.deckNodeId, name: result.deckName },
        card: { nodeId: card.nodeId, name: card.name },
        faceDown,
        inverted,
        // The back is carried only on a Face Down draw — it is the image the
        // message renders. A face-up draw records no back.
        back: faceDown && card.back !== null ? card.back : undefined,
      });
    },
  },
});
