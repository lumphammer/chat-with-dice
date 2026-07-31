import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

// TERMINOLOGY
// STORY CARD: one of the nineteen cards built into this capability. Unlike a
//   Card in the `cards` capability it is not an image in anybody's file store —
//   there is nothing to look at, only a type and (for an Obstruction) a
//   difficulty.
// STORY DECK: the room's stack of Story Cards, built by the setup ritual and
//   drawn from the top, one card per scene.
// GREY LADY: the three cards seeded through the Story Deck by the setup ritual.
//   The third is always the last card in the deck.
// OBSTRUCTION: a Story Card that has to be beaten with a d10 roll against its
//   difficulty. The two obstructing kinds carry one; the others don't.

export const D10_SIDES = 10;

/** Every Obstruction's difficulty sits in this inclusive range. */
const MIN_DIFFICULTY = 4;
const MAX_DIFFICULTY = 7;

/** Resolve spent *before* the roll is worth this much each. */
export const RESOLVE_BEFORE_BONUS = 2;

const HARMED_COUNT = 4;
const CLUE_COUNT = 4;

// The setup ritual splits the shuffled narrative cards into three piles, and
// recombines them with the larger pile at the bottom.
const SMALL_PILE_SIZE = 5;
export const GREY_LADY_COUNT = 3;

/** Features and Fears are three apiece, always — they are sheet lines, not lists. */
const PROTAGONIST_LIST_LENGTH = 3;

const DEFAULT_TRACKER_MAX = 5;
/** Nothing in the game needs a bigger track; this only stops silly input. */
export const MAX_TRACKER_MAX = 20;

const storyCardKindValidator = z.enum([
  "secondaryCharacterObstructs",
  "environmentObstructs",
  "secondaryCharacterHarmed",
  "clue",
  "greyLady",
]);

export type StoryCardKind = z.infer<typeof storyCardKindValidator>;

/** The two kinds that obstruct, and so carry a difficulty. */
const OBSTRUCTION_KINDS = [
  "secondaryCharacterObstructs",
  "environmentObstructs",
] as const satisfies StoryCardKind[];

const difficultyValidator = z.int().min(MIN_DIFFICULTY).max(MAX_DIFFICULTY);

const storyCardValidator = z.object({
  id: z.nanoid(),
  kind: storyCardKindValidator,
  // Only the two obstructing kinds carry one.
  difficulty: difficultyValidator.optional(),
});

export type StoryCard = z.infer<typeof storyCardValidator>;

export const STORY_CARD_LABELS: Record<StoryCardKind, string> = {
  secondaryCharacterObstructs: "Secondary character obstructs",
  environmentObstructs: "Environment obstructs",
  secondaryCharacterHarmed: "Secondary character harmed",
  clue: "Clue",
  greyLady: "The Grey Lady",
};

const emptyProtagonistList = (): string[] =>
  Array.from({ length: PROTAGONIST_LIST_LENGTH }, () => "");

const protagonistListValidator = z
  .array(z.string())
  .length(PROTAGONIST_LIST_LENGTH);

const protagonistTextFieldValidator = z.enum([
  "name",
  "occupation",
  "background",
]);

const protagonistListFieldValidator = z.enum(["features", "fears"]);

const protagonistValidator = z.object({
  name: z.string(),
  occupation: z.string(),
  background: z.string(),
  features: protagonistListValidator,
  fears: protagonistListValidator,
});

const trackerNameValidator = z.enum(["spirit", "resolve"]);

const trackerValidator = z.object({
  max: z.int().min(1).max(MAX_TRACKER_MAX),
  current: z.int().min(0),
});

export type Tracker = z.infer<typeof trackerValidator>;

const defaultTracker = (): Tracker => ({
  max: DEFAULT_TRACKER_MAX,
  current: DEFAULT_TRACKER_MAX,
});

export const englishEerieStateValidator = z.object({
  protagonist: protagonistValidator,
  spirit: trackerValidator,
  resolve: trackerValidator,
  /** What is left of the Story Deck. Index 0 is the top: the next card drawn. */
  stack: z.array(storyCardValidator),
  /** Every Story Card drawn so far, in draw order. */
  drawn: z.array(storyCardValidator),
  /**
   * The Obstruction the next roll is made against — the last one drawn. Held in
   * state rather than passed up from the client so a roll cannot be made against
   * a difficulty nobody drew.
   */
  lastObstruction: z
    .object({ cardId: z.nanoid(), difficulty: difficultyValidator })
    .nullable(),
});

export type EnglishEerieState = z.infer<typeof englishEerieStateValidator>;

const drawMessageValidator = z.object({
  kind: z.literal("draw"),
  card: storyCardValidator,
  cardsRemaining: z.int().min(0),
  /** Which of the three Grey Ladies this was. Absent for a narrative card. */
  greyLadyNumber: z.int().min(1).max(GREY_LADY_COUNT).optional(),
});

const rollMessageValidator = z.object({
  kind: z.literal("roll"),
  difficulty: difficultyValidator,
  die: z.int().min(1).max(D10_SIDES),
  /** Resolve spent before the roll, worth `RESOLVE_BEFORE_BONUS` each. */
  spentBefore: z.int().min(0),
  /** Resolve spent after the roll, worth 1 each. Never both (see `boostRoll`). */
  spentAfter: z.int().min(0),
  total: z.int(),
  success: z.boolean(),
});

export const messageDataValidator = z.discriminatedUnion("kind", [
  drawMessageValidator,
  rollMessageValidator,
]);

export type ObstructionRollMessageData = z.infer<typeof rollMessageValidator>;

/** Shuffles a copy of `items`. Injected so deck construction stays pure. */
export type Shuffle = <T>(items: T[]) => T[];

function makeCard(kind: StoryCardKind, difficulty?: number): StoryCard {
  return difficulty === undefined
    ? { id: nanoid(), kind }
    : { id: nanoid(), kind, difficulty };
}

const DIFFICULTIES = Array.from(
  { length: MAX_DIFFICULTY - MIN_DIFFICULTY + 1 },
  (_, index) => MIN_DIFFICULTY + index,
);

/**
 * The sixteen narrative cards: each obstructing kind at every difficulty, plus
 * four Secondary Character Harmed and four Clue.
 */
export function buildNarrativeCards(): StoryCard[] {
  return [
    ...OBSTRUCTION_KINDS.flatMap((kind) =>
      DIFFICULTIES.map((difficulty) => makeCard(kind, difficulty)),
    ),
    ...Array.from({ length: HARMED_COUNT }, () =>
      makeCard("secondaryCharacterHarmed"),
    ),
    ...Array.from({ length: CLUE_COUNT }, () => makeCard("clue")),
  ];
}

/**
 * The setup ritual. Shuffle the sixteen narrative cards, split them into piles
 * of 5, 5 and 6, slide a Grey Lady under each pile, then stack the piles back up
 * with the six-card pile at the bottom.
 *
 * Index 0 is the top of the deck, so the Grey Ladies land at 5, 11 and 18 — the
 * third is always the very last card, which is how the story ends.
 */
export function buildStoryDeck(shuffle: Shuffle): StoryCard[] {
  const narrative = shuffle(buildNarrativeCards());
  const firstPile = narrative.slice(0, SMALL_PILE_SIZE);
  const secondPile = narrative.slice(SMALL_PILE_SIZE, SMALL_PILE_SIZE * 2);
  const thirdPile = narrative.slice(SMALL_PILE_SIZE * 2);
  return [
    ...firstPile,
    makeCard("greyLady"),
    ...secondPile,
    makeCard("greyLady"),
    ...thirdPile,
    makeCard("greyLady"),
  ];
}

/**
 * A d10 has to equal or beat the Obstruction's difficulty. Resolve spent before
 * the roll is worth two each; Resolve spent after it is worth one each. A roll
 * only ever has one or the other.
 */
export function evaluateObstructionRoll({
  die,
  difficulty,
  spentBefore,
  spentAfter,
}: {
  die: number;
  difficulty: number;
  spentBefore: number;
  spentAfter: number;
}): { total: number; success: boolean } {
  const total = die + spentBefore * RESOLVE_BEFORE_BONUS + spentAfter;
  return { total, success: total >= difficulty };
}

export function getInitialEnglishEerieState(): EnglishEerieState {
  return {
    protagonist: {
      name: "",
      occupation: "",
      background: "",
      features: emptyProtagonistList(),
      fears: emptyProtagonistList(),
    },
    spirit: defaultTracker(),
    resolve: defaultTracker(),
    // No deck until somebody performs the setup ritual: building one needs
    // randomness, which `getInitialState` must not have (it runs on both sides,
    // and the two must agree).
    stack: [],
    drawn: [],
    lastObstruction: null,
  };
}

export const englishEerieCommon = createCapabilityCommon({
  name: "englisheerie",
  displayName: "English Eerie",
  visibility: "public",
  messageDataValidator,
  state: {
    validator: englishEerieStateValidator,
    getInitialState: getInitialEnglishEerieState,
  },
  buildActions: ({ createAction }) => ({
    setProtagonistText: createAction({
      payloadValidator: z.object({
        field: protagonistTextFieldValidator,
        value: z.string(),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.protagonist[payload.field] = payload.value;
      },
    }),
    setProtagonistListItem: createAction({
      payloadValidator: z.object({
        field: protagonistListFieldValidator,
        index: z
          .int()
          .min(0)
          .max(PROTAGONIST_LIST_LENGTH - 1),
        value: z.string(),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.protagonist[payload.field][payload.index] = payload.value;
      },
    }),
    setTracker: createAction({
      payloadValidator: z.object({
        tracker: trackerNameValidator,
        current: z.int().min(0),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const tracker = stateDraft[payload.tracker];
        tracker.current = Math.min(payload.current, tracker.max);
      },
    }),
    setTrackerMax: createAction({
      payloadValidator: z.object({
        tracker: trackerNameValidator,
        max: z.int().min(1).max(MAX_TRACKER_MAX),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const tracker = stateDraft[payload.tracker];
        tracker.max = payload.max;
        // Shrinking the track can't leave more points on it than it has boxes.
        tracker.current = Math.min(tracker.current, payload.max);
      },
    }),
    // The four below are server-only: they need randomness, the authoritative
    // deck, or an edit to an existing chat message. No `pureFn`, so nothing is
    // predicted locally.
    setUpDeck: createAction({ payloadValidator: z.object({}) }),
    drawCard: createAction({ payloadValidator: z.object({}) }),
    rollObstruction: createAction({
      payloadValidator: z.object({ resolveSpentBefore: z.int().min(0) }),
    }),
    boostRoll: createAction({
      payloadValidator: z.object({
        messageId: z.string(),
        spend: z.int().min(1),
      }),
    }),
  }),
});
