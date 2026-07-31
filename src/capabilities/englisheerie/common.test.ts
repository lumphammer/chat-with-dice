import type { CommonActionDefinition } from "#/capabilities/createCapabilityCommon";
import {
  GREY_LADY_COUNT,
  type EnglishEerieState,
  type StoryCard,
  type StoryCardKind,
  buildNarrativeCards,
  buildStoryDeck,
  englishEerieCommon,
  englishEerieStateValidator,
  evaluateObstructionRoll,
  getInitialEnglishEerieState,
} from "./common";
import { produce } from "immer";
import { describe, expect, test } from "vitest";
import type * as z from "zod";

function runAction<TPayloadValidator extends z.ZodType>(
  state: EnglishEerieState,
  action: CommonActionDefinition<EnglishEerieState, TPayloadValidator>,
  payload: unknown,
): EnglishEerieState {
  const validatedPayload = action.payloadValidator.parse(payload);
  return produce(state, (stateDraft) => {
    action.pureFn?.({ stateDraft, payload: validatedPayload });
  });
}

const initialState = getInitialEnglishEerieState;

/** The deck-building order, unshuffled, so positions are predictable. */
const noShuffle = <T>(items: T[]): T[] => [...items];

function countKinds(cards: StoryCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.kind] = (counts[card.kind] ?? 0) + 1;
  }
  return counts;
}

const NARRATIVE_CARD_COUNT = 16;
const DECK_SIZE = 19;
const OBSTRUCTIONS_PER_KIND = 4;
const HARMED_AND_CLUE_COUNT = 4;
const FIRST_GREY_LADY_INDEX = 5;
const SECOND_GREY_LADY_INDEX = 11;
const THIRD_GREY_LADY_INDEX = 18;
const LARGE_PILE_SIZE = 6;
const MIN_DIFFICULTY = 4;
const EXPECTED_DIFFICULTIES = Array.from(
  { length: OBSTRUCTIONS_PER_KIND },
  (_, index) => MIN_DIFFICULTY + index,
);

describe("the narrative cards", () => {
  test("are sixteen, four of each kind", () => {
    const cards = buildNarrativeCards();
    expect(cards).toHaveLength(NARRATIVE_CARD_COUNT);
    expect(countKinds(cards)).toEqual({
      secondaryCharacterObstructs: OBSTRUCTIONS_PER_KIND,
      environmentObstructs: OBSTRUCTIONS_PER_KIND,
      secondaryCharacterHarmed: HARMED_AND_CLUE_COUNT,
      clue: HARMED_AND_CLUE_COUNT,
    });
  });

  test("carry a difficulty only when they obstruct", () => {
    const obstructingKinds: StoryCardKind[] = [
      "secondaryCharacterObstructs",
      "environmentObstructs",
    ];
    for (const card of buildNarrativeCards()) {
      if (obstructingKinds.includes(card.kind)) {
        expect(card.difficulty).toBeDefined();
      } else {
        expect(card.difficulty).toBeUndefined();
      }
    }
  });

  test("cover every difficulty once per obstructing kind", () => {
    const difficulties = buildNarrativeCards()
      .filter((card) => card.kind === "environmentObstructs")
      .map((card) => card.difficulty);
    expect(difficulties).toEqual(EXPECTED_DIFFICULTIES);
  });
});

describe("the story deck", () => {
  test("is nineteen cards, with three Grey Ladies", () => {
    const deck = buildStoryDeck(noShuffle);
    expect(deck).toHaveLength(DECK_SIZE);
    expect(deck.filter((card) => card.kind === "greyLady")).toHaveLength(
      GREY_LADY_COUNT,
    );
  });

  test("has a Grey Lady under each pile, with the six-card pile at the bottom", () => {
    const greyLadyIndexes = buildStoryDeck(noShuffle).flatMap((card, index) =>
      card.kind === "greyLady" ? [index] : [],
    );
    expect(greyLadyIndexes).toEqual([
      FIRST_GREY_LADY_INDEX,
      SECOND_GREY_LADY_INDEX,
      THIRD_GREY_LADY_INDEX,
    ]);
    // The gap before the last Grey Lady is the bottom pile: six, not five.
    expect(THIRD_GREY_LADY_INDEX - SECOND_GREY_LADY_INDEX - 1).toBe(
      LARGE_PILE_SIZE,
    );
  });

  test("ends on a Grey Lady", () => {
    const deck = buildStoryDeck(noShuffle);
    expect(deck[deck.length - 1].kind).toBe("greyLady");
  });

  test("keeps every narrative card, in shuffled order", () => {
    const reversed = <T>(items: T[]): T[] => [...items].reverse();
    const deck = buildStoryDeck(reversed);
    const narrative = deck.filter((card) => card.kind !== "greyLady");
    expect(narrative).toHaveLength(NARRATIVE_CARD_COUNT);
    expect(narrative.map((card) => card.kind)).toEqual(
      reversed(buildNarrativeCards()).map((card) => card.kind),
    );
  });

  test("parses as state", () => {
    const state = { ...initialState(), stack: buildStoryDeck(noShuffle) };
    expect(englishEerieStateValidator.safeParse(state).success).toBe(true);
  });
});

describe("evaluating an obstruction roll", () => {
  test("succeeds on equalling the difficulty", () => {
    expect(
      evaluateObstructionRoll({
        die: 6,
        difficulty: 6,
        spentBefore: 0,
        spentAfter: 0,
      }),
    ).toEqual({ total: 6, success: true });
  });

  test("fails one under", () => {
    expect(
      evaluateObstructionRoll({
        die: 5,
        difficulty: 6,
        spentBefore: 0,
        spentAfter: 0,
      }),
    ).toEqual({ total: 5, success: false });
  });

  test("pays two a point for Resolve spent before the roll", () => {
    expect(
      evaluateObstructionRoll({
        die: 3,
        difficulty: 7,
        spentBefore: 2,
        spentAfter: 0,
      }),
    ).toEqual({ total: 7, success: true });
  });

  test("pays one a point for Resolve spent after the roll", () => {
    expect(
      evaluateObstructionRoll({
        die: 5,
        difficulty: 7,
        spentBefore: 0,
        spentAfter: 2,
      }),
    ).toEqual({ total: 7, success: true });
  });
});

describe("the trackers", () => {
  test("clamp a spend to the length of the track", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setTracker,
      {
        tracker: "spirit",
        current: 99,
      },
    );
    expect(state.spirit.current).toBe(state.spirit.max);
  });

  test("lose points off the end when the track is shortened", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setTrackerMax,
      { tracker: "resolve", max: 3 },
    );
    expect(state.resolve).toEqual({ max: 3, current: 3 });
  });

  test("keep the points already spent when the track is lengthened", () => {
    const spent = runAction(
      initialState(),
      englishEerieCommon.actions.setTracker,
      { tracker: "resolve", current: 2 },
    );
    const lengthened = runAction(
      spent,
      englishEerieCommon.actions.setTrackerMax,
      { tracker: "resolve", max: 8 },
    );
    expect(lengthened.resolve).toEqual({ max: 8, current: 2 });
  });
});

describe("the protagonist sheet", () => {
  test("writes a text field", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setProtagonistText,
      { field: "occupation", value: "Curate" },
    );
    expect(state.protagonist.occupation).toBe("Curate");
  });

  test("writes one Feature without disturbing the others", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setProtagonistListItem,
      { field: "features", index: 1, value: "Reads Latin" },
    );
    expect(state.protagonist.features).toEqual(["", "Reads Latin", ""]);
    expect(state.protagonist.fears).toEqual(["", "", ""]);
  });

  test("refuses a line the sheet does not have", () => {
    expect(() =>
      runAction(
        initialState(),
        englishEerieCommon.actions.setProtagonistListItem,
        { field: "fears", index: 3, value: "Nope" },
      ),
    ).toThrow();
  });
});
