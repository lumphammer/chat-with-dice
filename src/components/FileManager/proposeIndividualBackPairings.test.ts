import {
  type PairingProposal,
  proposeIndividualBackPairings,
} from "./proposeIndividualBackPairings";
import { describe, expect, test } from "vitest";

// Build cards whose node id is just their name, so assertions read clearly.
function cards(...names: string[]) {
  return names.map((name) => ({ nodeId: name, name }));
}

// A proposal reduced to its front/back names, for order-independent matching.
function pair(proposal: PairingProposal) {
  return { front: proposal.front.name, back: proposal.back.name };
}

describe("proposeIndividualBackPairings", () => {
  test("pairs names differing only by front/back", () => {
    const result = proposeIndividualBackPairings(
      cards("ace-front.png", "ace-back.png"),
    );
    expect(result.map(pair)).toEqual([
      { front: "ace-front.png", back: "ace-back.png" },
    ]);
  });

  test("orients the proposal so the front is the front regardless of input order", () => {
    const result = proposeIndividualBackPairings(
      cards("ace-back.png", "ace-front.png"),
    );
    expect(result.map(pair)).toEqual([
      { front: "ace-front.png", back: "ace-back.png" },
    ]);
  });

  test("matches across underscore, dot and space delimiters", () => {
    const result = proposeIndividualBackPairings(
      cards(
        "card_01_front.jpg",
        "card_01_back.jpg",
        "two front.png",
        "two back.png",
      ),
    );
    expect(result.map(pair)).toEqual([
      { front: "card_01_front.jpg", back: "card_01_back.jpg" },
      { front: "two front.png", back: "two back.png" },
    ]);
  });

  test("is case-insensitive on the front/back token and the rest of the name", () => {
    const result = proposeIndividualBackPairings(
      cards("Ace-Front.png", "ace-back.png"),
    );
    expect(result.map(pair)).toEqual([
      { front: "Ace-Front.png", back: "ace-back.png" },
    ]);
  });

  test("does not pair when a token other than front/back also differs", () => {
    // Different card numbers: a front and a back of two different Cards.
    expect(
      proposeIndividualBackPairings(cards("01-front.png", "02-back.png")),
    ).toEqual([]);
  });

  test("does not pair when the extension differs", () => {
    expect(
      proposeIndividualBackPairings(cards("ace-front.png", "ace-back.jpg")),
    ).toEqual([]);
  });

  test("ignores front/back glued into another word", () => {
    expect(
      proposeIndividualBackPairings(cards("acefront.png", "aceback.png")),
    ).toEqual([]);
  });

  test("leaves an ambiguous image (matching two partners) for hand-pairing", () => {
    // `front-front.png` front/back-matches both `back-front.png` (first token)
    // and `front-back.png` (second token), so every proposal touching it is
    // dropped and nothing is proposed.
    expect(
      proposeIndividualBackPairings(
        cards("front-front.png", "back-front.png", "front-back.png"),
      ),
    ).toEqual([]);
  });

  test("keeps disjoint pairs while dropping only the ambiguous ones", () => {
    const result = proposeIndividualBackPairings(
      cards(
        "ace-front.png",
        "ace-back.png",
        // both of these front/back-match one another *and* nothing else, so
        // they stand; the pair above is independent.
        "king-front.png",
        "king-back.png",
      ),
    );
    expect(result.map(pair)).toEqual([
      { front: "ace-front.png", back: "ace-back.png" },
      { front: "king-front.png", back: "king-back.png" },
    ]);
  });

  test("proposes nothing for a deck the heuristic cannot crack", () => {
    expect(
      proposeIndividualBackPairings(
        cards("wands-recto.png", "wands-verso.png", "cups.png"),
      ),
    ).toEqual([]);
  });

  test("proposes nothing for an empty deck", () => {
    expect(proposeIndividualBackPairings([])).toEqual([]);
  });
});
