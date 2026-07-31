import type { CommonActionDefinition } from "#/capabilities/createCapabilityCommon";
import {
  ALLOCATION_TOTAL,
  GREY_LADY_COUNT,
  MIN_ALLOCATION,
  TRACK_LENGTH,
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

/** An unplayed sheet that has left setup: trackers, not an allocation. */
const playingState = (): EnglishEerieState => ({
  ...initialState(),
  mode: "play",
  stack: buildStoryDeck(noShuffle),
});

describe("the trackers in play", () => {
  const FILLED_CIRCLES = 3;

  test("count the filled circles", () => {
    const state = runAction(
      playingState(),
      englishEerieCommon.actions.setTracker,
      { tracker: "spirit", value: FILLED_CIRCLES },
    );
    expect(state.spirit).toBe(FILLED_CIRCLES);
  });

  test("empty all the way down", () => {
    const state = runAction(
      playingState(),
      englishEerieCommon.actions.setTracker,
      { tracker: "resolve", value: 0 },
    );
    expect(state.resolve).toBe(0);
  });

  test("refuse a value the track has no room for", () => {
    expect(() =>
      runAction(playingState(), englishEerieCommon.actions.setTracker, {
        tracker: "spirit",
        value: TRACK_LENGTH + 1,
      }),
    ).toThrow();
    expect(() =>
      runAction(playingState(), englishEerieCommon.actions.setTracker, {
        tracker: "spirit",
        value: -1,
      }),
    ).toThrow();
  });

  test("move one without disturbing the other", () => {
    const state = runAction(
      playingState(),
      englishEerieCommon.actions.setTracker,
      { tracker: "resolve", value: 1 },
    );
    expect(state.spirit).toBe(playingState().spirit);
  });
});

describe("the allocation on an unplayed sheet", () => {
  const HIGH = 7;
  const LOW = 3;

  test("begins split down the middle", () => {
    const { spirit, resolve } = initialState();
    expect(spirit + resolve).toBe(ALLOCATION_TOTAL);
    expect(spirit).toBe(resolve);
  });

  test("moves the other track to meet the one that moved", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setTracker,
      { tracker: "spirit", value: HIGH },
    );
    expect(state.spirit).toBe(HIGH);
    expect(state.resolve).toBe(ALLOCATION_TOTAL - HIGH);
  });

  test("clamps a value the other track has no room for", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setTracker,
      { tracker: "resolve", value: 0 },
    );
    expect(state.resolve).toBe(MIN_ALLOCATION);
    expect(state.spirit).toBe(TRACK_LENGTH);
  });

  test("stops linking once the story has started", () => {
    const started = {
      ...initialState(),
      drawn: [buildStoryDeck(noShuffle)[0]],
    };
    const state = runAction(started, englishEerieCommon.actions.setTracker, {
      tracker: "resolve",
      value: LOW,
    });
    expect(state.resolve).toBe(LOW);
    expect(state.spirit).toBe(initialState().spirit);
  });
});

describe("the modes", () => {
  test("start in setup", () => {
    expect(initialState().mode).toBe("setup");
  });

  test("read state stored before there were modes as setup", () => {
    const parsed = englishEerieStateValidator.safeParse({
      ...initialState(),
      mode: undefined,
    });
    expect(parsed.success && parsed.data.mode).toBe("setup");
  });

  test("reset the game to a blank setup", () => {
    const after = runAction(
      playingState(),
      englishEerieCommon.actions.resetGame,
      {},
    );
    expect(after).toEqual(initialState());
  });
});

describe("the protagonist sheet", () => {
  const sheet = {
    name: "Fred Bobkins",
    occupation: "Retired major",
    background: "Retired to the countryside to pursue antiquarianism",
    features: ["Sword cane", "Monocle", "Prominent scar"],
    fears: ["Bats", "Darkness", "Being alone"],
  };

  test("is written in one go", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setProtagonist,
      sheet,
    );
    expect(state.protagonist).toEqual(sheet);
  });

  test("leaves the rest of the state alone", () => {
    const before = initialState();
    const after = runAction(
      before,
      englishEerieCommon.actions.setProtagonist,
      sheet,
    );
    expect(after.spirit).toEqual(before.spirit);
    expect(after.resolve).toEqual(before.resolve);
    expect(after.stack).toEqual(before.stack);
  });

  test("is written a line at a time during setup", () => {
    const named = runAction(
      initialState(),
      englishEerieCommon.actions.setProtagonistLine,
      { field: "name", value: sheet.name },
    );
    const state = runAction(
      named,
      englishEerieCommon.actions.setProtagonistLine,
      { field: "fears", index: 1, value: "Bats" },
    );
    expect(state.protagonist.name).toBe(sheet.name);
    expect(state.protagonist.fears).toEqual(["", "Bats", ""]);
  });

  test("ignores a trio line with no line number", () => {
    const state = runAction(
      initialState(),
      englishEerieCommon.actions.setProtagonistLine,
      { field: "features", value: "Sword cane" },
    );
    expect(state.protagonist.features).toEqual(
      initialState().protagonist.features,
    );
  });

  test("refuses a trio line the trio has no room for", () => {
    expect(() =>
      runAction(initialState(), englishEerieCommon.actions.setProtagonistLine, {
        field: "features",
        index: 3,
        value: "Fourth feature",
      }),
    ).toThrow();
  });

  test("refuses a trio that is not three lines", () => {
    expect(() =>
      runAction(initialState(), englishEerieCommon.actions.setProtagonist, {
        ...sheet,
        features: ["Sword cane", "Monocle"],
      }),
    ).toThrow();
    expect(() =>
      runAction(initialState(), englishEerieCommon.actions.setProtagonist, {
        ...sheet,
        fears: ["Bats", "Darkness", "Being alone", "Moths"],
      }),
    ).toThrow();
  });
});
