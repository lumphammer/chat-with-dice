import type { CommonActionDefinition } from "#/capabilities/createCapabilityCommon";
import {
  MAX_LEGACIES,
  MAX_PALETTE_ENTRIES,
  MAX_TIMELINE_ITEMS,
  type MicroscopeState,
  type Period,
  canAddTimelineItem,
  countTimelineItems,
  findItem,
  getInitialMicroscopeState,
  microscopeCommon,
} from "./common";
import { produce } from "immer";
import { nanoid } from "nanoid";
import { describe, expect, test } from "vitest";
import type * as z from "zod";

function runAction<TPayloadValidator extends z.ZodType>(
  state: MicroscopeState,
  action: CommonActionDefinition<MicroscopeState, TPayloadValidator>,
  payload: unknown,
): MicroscopeState {
  const validatedPayload = action.payloadValidator.parse(payload);
  return produce(state, (stateDraft) => {
    action.pureFn?.({ stateDraft, payload: validatedPayload });
  });
}

const {
  createItem,
  editItem,
  moveItem,
  deleteItem,
  createLegacy,
  addPaletteEntry,
  removePaletteEntry,
  setBigPicture,
  resetGame,
} = microscopeCommon.actions;

/**
 * A two-period history: the first period holds two events, the first of which
 * holds two scenes. Ids are real nanoids because that is what the payload
 * validators insist on.
 */
function seed() {
  const ids = {
    firstPeriod: nanoid(),
    secondPeriod: nanoid(),
    firstEvent: nanoid(),
    secondEvent: nanoid(),
    firstScene: nanoid(),
    secondScene: nanoid(),
  };
  let state = getInitialMicroscopeState();
  const creations = [
    [ids.firstPeriod, { relation: "in", targetId: null }, "The First Age"],
    [ids.secondPeriod, { relation: "in", targetId: null }, "The Fall"],
    [
      ids.firstEvent,
      { relation: "in", targetId: ids.firstPeriod },
      "The gates open",
    ],
    [
      ids.secondEvent,
      { relation: "in", targetId: ids.firstPeriod },
      "The first census",
    ],
    [
      ids.firstScene,
      { relation: "in", targetId: ids.firstEvent },
      "Who opened them?",
    ],
    [
      ids.secondScene,
      { relation: "in", targetId: ids.firstEvent },
      "What came through?",
    ],
  ] as const;
  for (const [id, placement, text] of creations) {
    state = runAction(state, createItem, {
      id,
      placement,
      tone: "light",
      text,
    });
  }
  return { state, ids };
}

const periodTexts = (state: MicroscopeState) =>
  state.periods.map((period) => period.text);

const eventTexts = (period: Period) => period.events.map((event) => event.text);

describe("making timeline items", () => {
  test("the level comes from the placement, not the payload", () => {
    const { state, ids } = seed();

    expect(periodTexts(state)).toEqual(["The First Age", "The Fall"]);
    expect(eventTexts(state.periods[0])).toEqual([
      "The gates open",
      "The first census",
    ]);
    expect(
      state.periods[0].events[0].scenes.map((scene) => scene.question),
    ).toEqual(["Who opened them?", "What came through?"]);
    expect(findItem(state, ids.firstScene)?.kind).toBe("scene");
  });

  test("a scene's text becomes its question, and its answer waits", () => {
    const { state, ids } = seed();
    const scene = state.periods[0].events[0].scenes[0];

    expect(scene.question).toBe("Who opened them?");
    expect(scene.answer).toBe("");
    expect(findItem(state, ids.firstScene)?.index).toBe(0);
  });

  test("before and after place an item among its target's siblings", () => {
    const { state, ids } = seed();

    const withBefore = runAction(state, createItem, {
      id: nanoid(),
      placement: { relation: "before", targetId: ids.firstPeriod },
      tone: "dark",
      text: "Before the beginning",
    });
    const withBoth = runAction(withBefore, createItem, {
      id: nanoid(),
      placement: { relation: "after", targetId: ids.firstPeriod },
      tone: "dark",
      text: "Between",
    });

    expect(periodTexts(withBoth)).toEqual([
      "Before the beginning",
      "The First Age",
      "Between",
      "The Fall",
    ]);
  });

  test("nothing can be put inside a scene", () => {
    const { state, ids } = seed();

    const after = runAction(state, createItem, {
      id: nanoid(),
      placement: { relation: "in", targetId: ids.firstScene },
      tone: "light",
      text: "A sub-scene",
    });

    expect(after).toEqual(state);
  });

  test("a placement naming something that has gone is dropped", () => {
    const { state } = seed();

    const after = runAction(state, createItem, {
      id: nanoid(),
      placement: { relation: "after", targetId: nanoid() },
      tone: "light",
      text: "Orphan",
    });

    expect(after).toEqual(state);
  });

  test("an id already in use is refused", () => {
    const { state, ids } = seed();

    const after = runAction(state, createItem, {
      id: ids.firstPeriod,
      placement: { relation: "in", targetId: null },
      tone: "dark",
      text: "An impostor",
    });

    expect(after).toEqual(state);
  });

  test("the timeline stops accepting items when it is full", () => {
    const periods: Period[] = Array.from(
      { length: MAX_TIMELINE_ITEMS },
      (_unused, index) => ({
        id: nanoid(),
        tone: "light",
        text: `Period ${index}`,
        events: [],
      }),
    );
    const full: MicroscopeState = { ...getInitialMicroscopeState(), periods };

    expect(countTimelineItems(full)).toBe(MAX_TIMELINE_ITEMS);
    expect(canAddTimelineItem(full)).toBe(false);

    const after = runAction(full, createItem, {
      id: nanoid(),
      placement: { relation: "in", targetId: null },
      tone: "light",
      text: "One too many",
    });

    expect(after.periods).toHaveLength(MAX_TIMELINE_ITEMS);
  });

  test("counting walks the whole fractal", () => {
    const { state } = seed();

    const SEEDED_ITEM_COUNT = 6; // two periods, two events, two scenes
    expect(countTimelineItems(state)).toBe(SEEDED_ITEM_COUNT);
  });
});

describe("editing timeline items", () => {
  test("a scene's answer is left alone when the payload omits it", () => {
    const { state, ids } = seed();

    const answered = runAction(state, editItem, {
      id: ids.firstScene,
      tone: "dark",
      text: "Who opened them?",
      answer: "The keeper, and she knew what she was doing",
    });
    const retitled = runAction(answered, editItem, {
      id: ids.firstScene,
      tone: "dark",
      text: "Who unbarred the gates?",
    });

    const scene = retitled.periods[0].events[0].scenes[0];
    expect(scene.question).toBe("Who unbarred the gates?");
    expect(scene.answer).toBe("The keeper, and she knew what she was doing");
    expect(scene.tone).toBe("dark");
  });

  test("editing a period rewrites its text and tone, not its children", () => {
    const { state, ids } = seed();

    const after = runAction(state, editItem, {
      id: ids.firstPeriod,
      tone: "dark",
      text: "The First Age, reconsidered",
    });

    expect(after.periods[0].text).toBe("The First Age, reconsidered");
    expect(after.periods[0].tone).toBe("dark");
    expect(after.periods[0].events).toHaveLength(2);
  });
});

describe("moving timeline items", () => {
  test("an event moves to another period", () => {
    const { state, ids } = seed();

    const after = runAction(state, moveItem, {
      id: ids.firstEvent,
      placement: { relation: "in", targetId: ids.secondPeriod },
    });

    expect(eventTexts(after.periods[0])).toEqual(["The first census"]);
    expect(eventTexts(after.periods[1])).toEqual(["The gates open"]);
    // The event keeps its scenes.
    expect(after.periods[1].events[0].scenes).toHaveLength(2);
  });

  test("moving later within the same list lands where it was asked to", () => {
    const { state, ids } = seed();

    const after = runAction(state, moveItem, {
      id: ids.firstPeriod,
      placement: { relation: "after", targetId: ids.secondPeriod },
    });

    expect(periodTexts(after)).toEqual(["The Fall", "The First Age"]);
  });

  test("moving earlier within the same list does too", () => {
    const { state, ids } = seed();

    const after = runAction(state, moveItem, {
      id: ids.secondEvent,
      placement: { relation: "before", targetId: ids.firstEvent },
    });

    expect(eventTexts(after.periods[0])).toEqual([
      "The first census",
      "The gates open",
    ]);
  });

  test("moving an item next to itself changes nothing", () => {
    const { state, ids } = seed();

    const after = runAction(state, moveItem, {
      id: ids.firstPeriod,
      placement: { relation: "after", targetId: ids.firstPeriod },
    });

    expect(periodTexts(after)).toEqual(["The First Age", "The Fall"]);
  });

  test("an item cannot be moved to the wrong level", () => {
    const { state, ids } = seed();

    const after = runAction(state, moveItem, {
      id: ids.firstScene,
      placement: { relation: "after", targetId: ids.firstPeriod },
    });

    expect(after).toEqual(state);
  });
});

describe("deleting timeline items", () => {
  test("a period takes its whole subtree with it", () => {
    const { state, ids } = seed();

    const after = runAction(state, deleteItem, { id: ids.firstPeriod });

    expect(periodTexts(after)).toEqual(["The Fall"]);
    expect(countTimelineItems(after)).toBe(1);
    expect(findItem(after, ids.firstScene)).toBeUndefined();
  });

  test("deleting something that has already gone is harmless", () => {
    const { state } = seed();

    const after = runAction(state, deleteItem, { id: nanoid() });

    expect(after).toEqual(state);
  });
});

describe("legacies and the palette", () => {
  test("legacies stop at the cap", () => {
    let state = getInitialMicroscopeState();
    for (let index = 0; index <= MAX_LEGACIES; index++) {
      state = runAction(state, createLegacy, {
        id: nanoid(),
        text: `Legacy ${index}`,
      });
    }

    expect(state.legacies).toHaveLength(MAX_LEGACIES);
  });

  test("the two palette lists are independent", () => {
    const yesId = nanoid();
    let state = runAction(getInitialMicroscopeState(), addPaletteEntry, {
      id: yesId,
      list: "yes",
      text: "Ghosts",
    });
    state = runAction(state, addPaletteEntry, {
      id: nanoid(),
      list: "no",
      text: "Time travel",
    });

    expect(state.palette.yes).toHaveLength(1);
    expect(state.palette.no).toHaveLength(1);

    state = runAction(state, removePaletteEntry, { id: yesId, list: "yes" });

    expect(state.palette.yes).toHaveLength(0);
    expect(state.palette.no).toHaveLength(1);
  });

  test("each palette list has its own cap", () => {
    let state = getInitialMicroscopeState();
    for (let index = 0; index <= MAX_PALETTE_ENTRIES; index++) {
      state = runAction(state, addPaletteEntry, {
        id: nanoid(),
        list: "yes",
        text: `Yes ${index}`,
      });
    }

    expect(state.palette.yes).toHaveLength(MAX_PALETTE_ENTRIES);
  });
});

describe("the whole sheet", () => {
  test("resetting returns a blank history", () => {
    const { state } = seed();
    const written = runAction(state, setBigPicture, {
      text: "Humanity reaches the stars and finds it is not alone",
    });

    expect(written.bigPicture).toBe(
      "Humanity reaches the stars and finds it is not alone",
    );

    const after = runAction(written, resetGame, {});

    expect(after).toEqual(getInitialMicroscopeState());
  });
});
