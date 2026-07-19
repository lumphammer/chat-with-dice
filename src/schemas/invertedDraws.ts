/**
 * Deck configuration (ADR-0001 decision 6) for Inverted draws — a Card drawn
 * rotated 180°, as if turned around flat on the table. Three states, because a
 * rotated *back* is a separate choice from a rotated *front*:
 *
 * - `"none"`: the Deck never produces Inverted draws.
 * - `"fronts"`: only a draw showing its front (i.e. not Face Down) can come up
 *   Inverted. A Face Down draw is never rotated.
 * - `"fronts-and-backs"`: any draw can come up Inverted, including a Face Down
 *   one — which then shows its back rotated 180°.
 *
 * This is Deck configuration and travels with the Deck into any Room. Whether a
 * given draw actually *came up* Inverted stays a property of that draw, recorded
 * on the Card Draw Message. `"none"` is the default.
 */
export const invertedDrawsValues = [
  "none",
  "fronts",
  "fronts-and-backs",
] as const;

export type InvertedDraws = (typeof invertedDrawsValues)[number];
