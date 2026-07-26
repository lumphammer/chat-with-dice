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

      // Whether drawn Cards are kept out is the Deck's rule, read from the
      // owner's store alongside the Card list, so one Deck behaves the same in
      // every Room (ADR-0001 decision 6, as amended). Only the Discard is
      // room-side, and a Deck with no Pile entry has an empty one.
      const dwindling = result.drawToDiscardPile;
      const pile = findPile(
        stateDraft,
        payload.ownerUserId,
        payload.deckNodeId,
      );

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

      // A dwindling Deck keeps the drawn Card out by recording it in this
      // Room's Discard, creating the Pile if this is the first Card to be kept
      // out. The draw is the only place a Pile is born: the rule that used to
      // create one lives in the owner's store now.
      if (dwindling) {
        if (pile) {
          pile.discard.push(card.nodeId);
        } else {
          stateDraft.piles.push({
            ownerUserId: payload.ownerUserId,
            deckNodeId: payload.deckNodeId,
            discard: [card.nodeId],
            hidden: false,
          });
        }
      } else if (pile && pile.discard.length > 0) {
        // The Deck returns its Cards but this Room still holds a Discard from
        // when it did not. Drop the entry: a Pile with an empty Discard only
        // restates the default, so re-enabling later starts from the whole Deck.
        //
        // Deliberately here, at the first draw under the new rule, rather than
        // pushed out to every Room the moment the owner changes the setting.
        // The change only *lands* in a Room when that Room next draws — until
        // then the Discard is dormant and unobservable: the sidebar hides the
        // readout and Reset while the rule is off, and the draw above ignores
        // the Discard entirely. So flipping the rule off and back on with no
        // draw in between correctly leaves the Room exactly as it was; nothing
        // happened here to change it. Two Rooms sharing one Deck can therefore
        // land the change at different times, which is right — the Discard is
        // per-Room.
        //
        // `hidden` needs no special case here. It exists solely to keep a
        // Discard alive across a bin and restore (ADR-0001 decision 12), and
        // this branch is clearing that Discard regardless, so a hidden entry has
        // nothing left worth preserving. A hidden Pile cannot reach this code in
        // any case: its Deck is binned, so the reachability check in
        // `listDeckCards` fails and the draw errors out well before here.
        stateDraft.piles.splice(
          stateDraft.piles.findIndex(
            (p) =>
              p.ownerUserId === payload.ownerUserId &&
              p.deckNodeId === payload.deckNodeId,
          ),
          1,
        );
      }

      sendChatMessage({
        ownerUserId: payload.ownerUserId,
        deck: { nodeId: payload.deckNodeId, name: result.deckName },
        card: { nodeId: card.nodeId, name: card.name },
        faceDown,
        inverted,
        // Carry the back whenever the Card has one so a face-up draw can be
        // turned Face Down later without another lookup.
        back: card.back ?? undefined,
      });
    },
    setFaceDown: async ({ payload, userId, editChatMessage }) => {
      await editChatMessage(payload.messageId, (data, message) => {
        if (
          message.userId !== userId ||
          (payload.faceDown && data.back === undefined)
        ) {
          return undefined;
        }
        return { ...data, faceDown: payload.faceDown };
      });
    },
    setInverted: async ({ payload, userId, editChatMessage }) => {
      await editChatMessage(payload.messageId, (data, message) => {
        if (message.userId !== userId) {
          return undefined;
        }
        return { ...data, inverted: payload.inverted };
      });
    },
  },
  hooks: {
    // The Deck's availability changed in the owner's store: it was binned, or
    // restored, or an ancestor of it was. Binning is reversible (soft delete),
    // so — unlike an unshare — the Pile is *hidden*, not dropped: its Discard
    // must survive so a restore inside the purge window brings the room's state
    // back intact (ADR-0001 decision 12).
    //
    // The change carries the *shared* Deck node's id, computed per share from
    // the owner's database, so a Deck shadowed by a binned ancestor arrives as a
    // change against the Deck's own id — no ancestor walk here, and the same
    // match covers it. A change for a Deck this room has no Pile for is normal,
    // not an error: a non-dwindling Deck has no stored entry and nothing to
    // preserve, exactly as `files` skips a share it never cached.
    onShareAvailabilityChange: ({ stateDraft, event: { changes } }) => {
      for (const change of changes) {
        const pile = findPile(stateDraft, change.ownerUserId, change.nodeId);
        if (pile) {
          pile.hidden = change.unavailable;
        }
      }
    },
    // The shared folder was marked or unmarked as a Deck in the owner's store.
    // Marking needs nothing here — the Pile is created lazily on first draw.
    // Unmarking abandons the Pile outright (issue #71): a non-deck folder has
    // nothing to draw from, and keeping the Discard would only let a stale Pile
    // revive if the folder were re-marked. Re-sharing already starts a fresh
    // Pile, so re-marking should too.
    onShareDeckStatusChange: ({
      stateDraft,
      event: { ownerUserId, nodeId, isDeck },
    }) => {
      if (isDeck) {
        return;
      }
      const index = stateDraft.piles.findIndex(
        (pile) =>
          pile.ownerUserId === ownerUserId && pile.deckNodeId === nodeId,
      );
      if (index !== -1) {
        stateDraft.piles.splice(index, 1);
      }
    },
    // The grant is gone for good — the Deck was unshared in-room, or the owner's
    // node was hard-deleted or purged. Unlike binning there is nothing left to
    // restore, so drop the Pile and its Discard rather than hiding it. Same
    // removal the `unshareFile` action drives, but from the owner's DO.
    // Idempotent: an in-room unshare fires this too, and finding no Pile is fine.
    "files:onShareRemoved": ({
      stateDraft,
      event: { ownerUserId, nodeId },
    }) => {
      const index = stateDraft.piles.findIndex(
        (pile) =>
          pile.ownerUserId === ownerUserId && pile.deckNodeId === nodeId,
      );
      if (index !== -1) {
        stateDraft.piles.splice(index, 1);
      }
    },
  },
});
