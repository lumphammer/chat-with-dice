import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

/**
 * A Card Draw Message: the record of one draw from a Pile. It names the drawn
 * Card (its front) and the Deck it came from, and records whether the Card came
 * up Face Down and/or Inverted (ADR-0001 decision 6 — how a draw came up is a
 * property of that draw).
 *
 * `ownerUserId` + `card.nodeId` are the trust-bearing pair: the image is served
 * (and re-authorised) through the `/api/files/[ownerUserId]/[nodeId]` route.
 * The Deck and Card names are snapshot display metadata — a draw is a record of
 * one moment, not a live view — but all of it is filled in server-side from the
 * owner's file store, never from anything the drawer supplied.
 *
 * `faceDown` defaults to `false` so Card Draw Messages recorded before Face Down
 * existed keep parsing. `back` is the Card's back image, present only on a Face
 * Down draw — that is the image the message renders. Face Down is presentation,
 * not secrecy (decision 7): the front is still carried in `card`, snoopable by
 * anyone determined, so nothing here is withheld.
 *
 * `inverted` — whether the Card came up rotated 180° while still showing its
 * front (a tarot "reversed"). It defaults to `false` so messages recorded before
 * Inverted existed keep parsing, and it is orthogonal to `faceDown`: a draw can
 * be both, in which case the message renders the *back* rotated 180° (CONTEXT.md
 * — turning a Card around on the table rotates it whichever way it lands).
 */
export const cardDrawMessageDataValidator = z
  .object({
    ownerUserId: z.string(),
    deck: z.object({
      nodeId: z.string(),
      name: z.string(),
    }),
    card: z.object({
      nodeId: z.string(),
      name: z.string(),
    }),
    faceDown: z.boolean().default(false),
    inverted: z.boolean().default(false),
    back: z
      .object({
        nodeId: z.string(),
        name: z.string(),
      })
      .optional(),
  })
  // The two are paired: a Face Down draw carries the back it renders, and a
  // face-up draw carries none. Enforcing it here keeps the only two valid shapes
  // the server ever emits from drifting apart, and rejects a malformed message
  // (e.g. `faceDown` with no back to show) rather than rendering it half-formed.
  .refine(
    (data) =>
      data.faceDown ? data.back !== undefined : data.back === undefined,
    {
      message:
        "A face-down draw must carry a back, and a face-up draw must not",
    },
  );

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
 * - `hidden` — whether the Deck is currently binned (or shadowed by a binned
 *   ancestor) in the owner's store. Binning is reversible, so the Pile is
 *   hidden rather than destroyed and its Discard survives to be restored inside
 *   the purge window (ADR-0001 decision 12). Set from `onShareAvailability
 *   Change` and cleared on restore, mirroring the `unavailable` flag `files`
 *   keeps on a binned share. Defaults `false` so Piles stored before this field
 *   existed keep parsing, and a live dwindling Pile is visible.
 *
 * A Deck with no entry here behaves as a fresh, non-dwindling Pile.
 */
const pileValidator = z.object({
  ownerUserId: z.string(),
  deckNodeId: z.string(),
  returnCards: z.boolean(),
  discard: z.array(z.string()),
  hidden: z.boolean().default(false),
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
    // Set a Pile's dwindle rule.
    //
    // Non-dwindling (Cards return) is the default, so it needs no stored Pile:
    // turning Cards back on drops any entry entirely rather than leaving one
    // that merely restates the default. That keeps state minimal — a client
    // toggling decks it will never dwindle cannot accumulate no-op Piles — and
    // means toggling back to dwindling later starts from the whole Deck rather
    // than resurfacing an old Discard. A dwindling Pile (returnCards `false`),
    // by contrast, is genuinely non-default and gets an entry.
    setReturnCards: createAction({
      payloadValidator: z.object({
        ownerUserId: z.string(),
        deckNodeId: z.string(),
        returnCards: z.boolean(),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const index = stateDraft.piles.findIndex(
          (p) =>
            p.ownerUserId === payload.ownerUserId &&
            p.deckNodeId === payload.deckNodeId,
        );
        if (payload.returnCards) {
          if (index !== -1) {
            stateDraft.piles.splice(index, 1);
          }
          return;
        }
        if (index === -1) {
          stateDraft.piles.push({
            ownerUserId: payload.ownerUserId,
            deckNodeId: payload.deckNodeId,
            returnCards: false,
            discard: [],
            hidden: false,
          });
        } else {
          stateDraft.piles[index].returnCards = false;
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
