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
 * The Deck and Card names are snapshot display metadata, exactly like a Shared
 * Item Message — a draw is a record of one moment, not a live view.
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
      // things the server needs to authorise and list Cards. `deckName` is
      // carried through purely so the Card Draw Message can label its Deck; it
      // is display text, never trusted for access.
      payloadValidator: z.object({
        ownerUserId: z.string(),
        deckNodeId: z.string(),
        deckName: z.string(),
      }),
    }),
  }),
});
