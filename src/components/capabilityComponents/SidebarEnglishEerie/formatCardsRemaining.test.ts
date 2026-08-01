import { formatCardsRemaining } from "./formatCardsRemaining";
import { describe, expect, test } from "vitest";

const FULL_DECK = 19;

describe("counting the cards left in the Story Deck", () => {
  test("says the count in the plural", () => {
    expect(formatCardsRemaining(FULL_DECK)).toBe("19 cards remain");
  });

  test("says the last card in the singular", () => {
    expect(formatCardsRemaining(1)).toBe("1 card remains");
  });

  test("says none in the plural", () => {
    expect(formatCardsRemaining(0)).toBe("0 cards remain");
  });
});
