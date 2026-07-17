import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
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
 * The `cards` capability holds Piles in later slices; for now it is stateless.
 * Every Card returns to the Pile after drawing, so there is no Discard to
 * store and a draw is a pure server-side effect — pick uniformly at random
 * from the Deck's live Cards and broadcast a Card Draw Message.
 */
export const cardsCommon = createCapabilityCommon({
  name: "cards",
  displayName: "Cards",
  visibility: "public",
  messageDataValidator: cardDrawMessageDataValidator,
  buildActions: ({ createAction }) => ({
    draw: createAction({
      // The Deck is identified by its owner and folder node id — the only two
      // things the server needs to authorise, validate deck-ness, and list
      // Cards. The Deck's name is not accepted from the caller; the server reads
      // it from the owner's file store so a drawer cannot mislabel the Deck.
      payloadValidator: z.object({
        ownerUserId: z.string(),
        deckNodeId: z.string(),
      }),
    }),
  }),
});
