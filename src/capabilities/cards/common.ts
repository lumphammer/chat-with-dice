import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import type { Draft } from "immer";
import { z } from "zod/v4";

/**
 * A Card Draw Message: the record of one draw from a Pile. For this first
 * slice it names the drawn Card (front only) and the Deck it came from. Backs,
 * Inversion and Face Down draws are later slices, so nothing about the Card's
 * orientation is recorded yet.
 *
 * `ownerUserId` + `card.nodeId` are the trust-bearing pair: the image is served
 * (and re-authorised) through the `/api/files/[ownerUserId]/[nodeId]` route.
 * The Deck and Card names are snapshot display metadata — a draw is a record of
 * one moment, not a live view — but both are filled in server-side from the
 * owner's file store, never from anything the drawer supplied.
 */
export const cardDrawMessageDataValidator = z.object({
  ownerUserId: z.string(),
  deck: z.object({
    nodeId: z.string(),
    name: z.string(),
  }),
  card: z.object({
    nodeId: z.string(),
    name: z.string(),
  }),
});

export type CardDrawMessageData = z.infer<typeof cardDrawMessageDataValidator>;

/**
 * A Pile: one Room's draw state for one Deck, keyed by the Deck's owner and
 * folder node id (ADR-0001 decision 5). It holds only room-side truth:
 *
 * - `returnCards` — the table rule for whether a drawn Card goes back into the
 *   Pile. This is Pile configuration, not Deck configuration, so it stays
 *   room-side and does not travel with the Deck (decision 6). `true` is the
 *   non-dwindling default; `false` makes the Pile dwindle.
 * - `discard` — the Cards drawn and kept out while dwindling, by node id. The
 *   remaining Cards are derived as liveCards − discard at draw time and never
 *   stored (decision 4), so an added Card is instantly drawable and a deleted
 *   one just goes inert. Empty whenever `returnCards` is `true`.
 *
 * A Deck with no entry here behaves as a fresh, non-dwindling Pile.
 */
const pileValidator = z.object({
  ownerUserId: z.string(),
  deckNodeId: z.string(),
  returnCards: z.boolean(),
  discard: z.array(z.string()),
});

export type Pile = z.infer<typeof pileValidator>;

export const cardsStateValidator = z.object({
  piles: z.array(pileValidator),
});

export type CardsState = z.infer<typeof cardsStateValidator>;

/**
 * Find the Pile for `(ownerUserId, deckNodeId)` in `stateDraft`. Returns
 * `undefined` for a Deck that has never been configured or drawn from — such a
 * Deck is a fresh, non-dwindling Pile and needs no stored entry.
 */
export function findPile(
  state: { piles: Pile[] },
  ownerUserId: string,
  deckNodeId: string,
): Pile | undefined {
  return state.piles.find(
    (pile) =>
      pile.ownerUserId === ownerUserId && pile.deckNodeId === deckNodeId,
  );
}

/**
 * Get the Pile for `(ownerUserId, deckNodeId)`, creating a default
 * (non-dwindling, empty Discard) entry in the draft if there isn't one yet.
 */
function getOrCreatePile(
  stateDraft: Draft<CardsState>,
  ownerUserId: string,
  deckNodeId: string,
): Draft<Pile> {
  const existing = stateDraft.piles.find(
    (pile) =>
      pile.ownerUserId === ownerUserId && pile.deckNodeId === deckNodeId,
  );
  if (existing) {
    return existing;
  }
  const pile: Pile = {
    ownerUserId,
    deckNodeId,
    returnCards: true,
    discard: [],
  };
  stateDraft.piles.push(pile);
  return stateDraft.piles[stateDraft.piles.length - 1];
}

/**
 * The `cards` capability holds Piles: per-room draw state for each shared Deck.
 * A draw picks uniformly at random from the Deck's live Cards, honouring the
 * Pile's dwindle rule, and broadcasts a Card Draw Message. Reset empties a
 * Pile's Discard so every Card is drawable again.
 */
export const cardsCommon = createCapabilityCommon({
  name: "cards",
  displayName: "Cards",
  visibility: "public",
  messageDataValidator: cardDrawMessageDataValidator,
  state: {
    validator: cardsStateValidator,
    getInitialState: () => ({ piles: [] }),
  },
  buildActions: ({ createAction }) => ({
    draw: createAction({
      // The Deck is identified by its owner and folder node id — the only two
      // things the server needs to authorise, validate deck-ness, and list
      // Cards. The Deck's name is not accepted from the caller; the server reads
      // it from the owner's file store so a drawer cannot mislabel the Deck.
      //
      // No `pureFn`: the drawn Card depends on server-side randomness and the
      // live Card list, so there is no optimistic transition to predict.
      payloadValidator: z.object({
        ownerUserId: z.string(),
        deckNodeId: z.string(),
      }),
    }),
    // Set a Pile's dwindle rule. Turning Cards back on empties the Discard —
    // a non-dwindling Pile has none, and toggling back to dwindling should
    // start from the whole Deck rather than resurface an old Discard.
    setReturnCards: createAction({
      payloadValidator: z.object({
        ownerUserId: z.string(),
        deckNodeId: z.string(),
        returnCards: z.boolean(),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const pile = getOrCreatePile(
          stateDraft,
          payload.ownerUserId,
          payload.deckNodeId,
        );
        pile.returnCards = payload.returnCards;
        if (payload.returnCards) {
          pile.discard = [];
        }
      },
    }),
    // Reset: return every Card in the Discard to the Pile.
    reset: createAction({
      payloadValidator: z.object({
        ownerUserId: z.string(),
        deckNodeId: z.string(),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const pile = stateDraft.piles.find(
          (p) =>
            p.ownerUserId === payload.ownerUserId &&
            p.deckNodeId === payload.deckNodeId,
        );
        if (pile) {
          pile.discard = [];
        }
      },
    }),
  }),
});
