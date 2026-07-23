import { createDirection } from "#/lib/minirouter";

/**
 * The drill-down destinations of the Deck settings dialog. Face-down draws is a
 * plain toggle and needs no destination; everything else opens its own panel.
 * {@link cardBack} is parameterised by the front Card's nodeId — the panel it
 * opens assigns an Individual Back to that one Card.
 */
export const invertedDraws = createDirection("invertedDraws");
export const commonBack = createDirection("commonBack");
export const individualBacks = createDirection("individualBacks");
export const cardBack = createDirection<string>("cardBack");
export const pairingProposals = createDirection("pairingProposals");
