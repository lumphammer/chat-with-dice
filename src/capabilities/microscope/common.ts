import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

// TERMINOLOGY
// BIG PICTURE: the single sentence covering the whole sweep of history. The one
//   thing in the game nothing else may contradict.
// PERIOD / EVENT / SCENE: the three levels of the fractal history. A Period
//   holds Events, an Event holds Scenes, and a Scene asks a Question and
//   records its Answer. TIMELINE ITEM is the word for all three at once, for
//   the many places the level doesn't matter.
// TONE: Light or Dark, carried by every Timeline Item. Chosen by whoever made
//   the item and not open to argument afterwards, which is why nothing here
//   treats it as editable-by-consensus — it is just a field anyone can change,
//   the same as the text.
// BOOKEND: the first and last Period. Deliberately *not* a state distinction —
//   it is whichever Period currently sits at each end, so making a new one
//   before the start simply moves the label.
// LEGACY: a thread of history the table keeps returning to. A flat list with no
//   Tone and no place on the timeline, because that is what it is in the game.
// PALETTE: the Yes and No lists agreed in setup — what this history may and may
//   not contain.
// PLACEMENT: where a Timeline Item is going, said relative to another item
//   rather than as an index. See `placementValidator`.

/**
 * A ceiling on the whole tree rather than one per level. Per-level caps
 * multiply out to a number nobody can reason about, and it is the *broadcast*
 * that needs bounding: capability state is re-sent to every socket in the room
 * in full on every change, and a Microscope history is the largest state any
 * capability here accumulates.
 *
 * Well past what a real table produces — a long campaign is tens of items, not
 * hundreds.
 */
export const MAX_TIMELINE_ITEMS = 500;

export const MAX_LEGACIES = 100;

/** Per list, so a room may hold this many Yes entries *and* this many No. */
export const MAX_PALETTE_ENTRIES = 100;

/** One limit for every text field in the capability. */
export const MAX_TEXT_LENGTH = 1000;

const toneValidator = z.enum(["light", "dark"]);

export type Tone = z.infer<typeof toneValidator>;

// Every text field in *state* is an unconstrained string, while every text
// field in an action *payload* is trimmed and length-checked. The asymmetry is
// on purpose. A failed state parse makes `mount` fall back to
// `getInitialState`, which for this capability means silently throwing away a
// whole evening of the table's work — by far the worst outcome available. So
// the limits are enforced at the door, where rejecting one action costs
// nothing, and state stays permissive enough that lowering a constant later
// can't destroy a room that was within the old one.

const sceneValidator = z.object({
  id: z.nanoid(),
  tone: toneValidator,
  question: z.string(),
  /** Empty until the scene has been played: the answer arrives later. */
  answer: z.string(),
});

type Scene = z.infer<typeof sceneValidator>;

/**
 * The domain word is just "Event". The prefix only dodges the DOM's global
 * `Event`, which components in this codebase reach for constantly.
 */
const timelineEventValidator = z.object({
  id: z.nanoid(),
  tone: toneValidator,
  text: z.string(),
  scenes: z.array(sceneValidator),
});

export type TimelineEvent = z.infer<typeof timelineEventValidator>;

const periodValidator = z.object({
  id: z.nanoid(),
  tone: toneValidator,
  text: z.string(),
  events: z.array(timelineEventValidator),
});

export type Period = z.infer<typeof periodValidator>;

const textEntryValidator = z.object({
  id: z.nanoid(),
  text: z.string(),
});

/** Shared by Legacies and Palette entries, which are different things that
 * happen to be shaped the same: an id and a line of text. */
export type Legacy = z.infer<typeof textEntryValidator>;

/**
 * Nested rather than a flat map of items keyed by id: order is then intrinsic
 * to the structure rather than a field that can disagree with it, and an Event
 * belonging to no Period is unrepresentable.
 */
export const microscopeStateValidator = z.object({
  bigPicture: z.string(),
  periods: z.array(periodValidator),
  legacies: z.array(textEntryValidator),
  palette: z.object({
    yes: z.array(textEntryValidator),
    no: z.array(textEntryValidator),
  }),
});

export type MicroscopeState = z.infer<typeof microscopeStateValidator>;

export function getInitialMicroscopeState(): MicroscopeState {
  return {
    bigPicture: "",
    periods: [],
    legacies: [],
    palette: { yes: [], no: [] },
  };
}

export type ItemKind = "period" | "event" | "scene";

/**
 * Where a Timeline Item goes, named relative to another item:
 * - `before` / `after` a sibling, which fixes the new item's level as that
 *   sibling's;
 * - `in` a container, which fixes it as that container's child level;
 * - `in` with no target, meaning the timeline itself — a new Period at the end.
 *
 * Never an index. The pure transition runs twice — optimistically against the
 * caller's state, then authoritatively against the server's — and those two can
 * differ by whatever else landed in between. "After that card" survives a
 * concurrent insert; "at index 4" quietly means something else.
 *
 * The item's kind is implied, never sent: "before a Period" can only produce a
 * Period. That removes the entire class of payloads whose stated kind disagrees
 * with where they're going.
 */
const placementValidator = z.discriminatedUnion("relation", [
  z.object({ relation: z.literal("before"), targetId: z.nanoid() }),
  z.object({ relation: z.literal("after"), targetId: z.nanoid() }),
  z.object({ relation: z.literal("in"), targetId: z.nanoid().nullable() }),
]);

export type Placement = z.infer<typeof placementValidator>;

/**
 * A position in the tree: the array an item sits in, and an index into it.
 * `findItem` returns where an item *is*; `resolvePlacement` returns where a new
 * one *goes*, which is the same thing plus one at the end of an array.
 */
export type ItemSlot =
  | { kind: "period"; siblings: Period[]; index: number }
  | { kind: "event"; siblings: TimelineEvent[]; index: number }
  | { kind: "scene"; siblings: Scene[]; index: number };

export function findItem(
  state: MicroscopeState,
  id: string,
): ItemSlot | undefined {
  const periodIndex = state.periods.findIndex((period) => period.id === id);
  if (periodIndex !== -1) {
    return { kind: "period", siblings: state.periods, index: periodIndex };
  }
  for (const period of state.periods) {
    const eventIndex = period.events.findIndex((event) => event.id === id);
    if (eventIndex !== -1) {
      return { kind: "event", siblings: period.events, index: eventIndex };
    }
    for (const event of period.events) {
      const sceneIndex = event.scenes.findIndex((scene) => scene.id === id);
      if (sceneIndex !== -1) {
        return { kind: "scene", siblings: event.scenes, index: sceneIndex };
      }
    }
  }
  return undefined;
}

/**
 * `undefined` when the placement names something that isn't there any more, or
 * something that can't contain what's being put in it. Both are ordinary: a
 * client can be working from a state one action out of date.
 */
export function resolvePlacement(
  state: MicroscopeState,
  placement: Placement,
): ItemSlot | undefined {
  if (placement.relation === "in") {
    if (placement.targetId === null) {
      return {
        kind: "period",
        siblings: state.periods,
        index: state.periods.length,
      };
    }
    const container = findItem(state, placement.targetId);
    if (container === undefined) {
      return undefined;
    }
    switch (container.kind) {
      case "period": {
        const { events } = container.siblings[container.index];
        return { kind: "event", siblings: events, index: events.length };
      }
      case "event": {
        const { scenes } = container.siblings[container.index];
        return { kind: "scene", siblings: scenes, index: scenes.length };
      }
      // A Scene is the bottom of the fractal; there is nothing to put inside
      // one.
      case "scene":
        return undefined;
    }
  }

  const sibling = findItem(state, placement.targetId);
  if (sibling === undefined) {
    return undefined;
  }
  const index =
    placement.relation === "before" ? sibling.index : sibling.index + 1;
  // Rebuilt per branch rather than spread, because a spread of a discriminated
  // union loses the tie between `kind` and the type of `siblings`.
  switch (sibling.kind) {
    case "period":
      return { kind: "period", siblings: sibling.siblings, index };
    case "event":
      return { kind: "event", siblings: sibling.siblings, index };
    case "scene":
      return { kind: "scene", siblings: sibling.siblings, index };
  }
}

export function countTimelineItems(state: MicroscopeState): number {
  return state.periods.reduce(
    (total, period) =>
      total +
      1 +
      period.events.reduce(
        (periodTotal, event) => periodTotal + 1 + event.scenes.length,
        0,
      ),
    0,
  );
}

/**
 * Shared by the pure transition, the server effect that reports the breach, and
 * the sidebar that greys the button out, so all three agree on when the room is
 * full.
 */
export function canAddTimelineItem(state: MicroscopeState): boolean {
  return countTimelineItems(state) < MAX_TIMELINE_ITEMS;
}

function insertAt<T>(siblings: T[], index: number, item: T): void {
  siblings.splice(index, 0, item);
}

/**
 * Takes a list of anything with an id rather than a generic `T[]`, so a caller
 * holding the union of the three sibling arrays can splice without first
 * narrowing to a level it doesn't care about.
 */
function removeAt(siblings: { id: string }[], index: number): void {
  siblings.splice(index, 1);
}

function relocate<T>(
  siblings: T[],
  fromIndex: number,
  toSiblings: T[],
  toIndex: number,
): void {
  const [item] = siblings.splice(fromIndex, 1);
  // Taking the item out shifts everything after it down one, so a destination
  // further along the *same* array is now one place earlier than resolved.
  const adjustedIndex =
    siblings === toSiblings && fromIndex < toIndex ? toIndex - 1 : toIndex;
  toSiblings.splice(adjustedIndex, 0, item);
}

const itemTextValidator = z.string().trim().min(1).max(MAX_TEXT_LENGTH);

/**
 * One `text` field for all three levels: on a Scene it is the Question, which
 * is the only text a Scene has when it is made. The Answer is written later,
 * through `editItem`.
 */
const createItemPayloadValidator = z.object({
  // Minted by the caller so the new card is on screen, and addressable, before
  // the round trip lands. The server checks it isn't already in use.
  id: z.nanoid(),
  placement: placementValidator,
  tone: toneValidator,
  text: itemTextValidator,
});

const editItemPayloadValidator = z.object({
  id: z.nanoid(),
  tone: toneValidator,
  text: itemTextValidator,
  /** Scenes only; ignored for the levels that have no Answer. */
  answer: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
});

const itemCreatedMessageValidator = z.object({
  kind: z.literal("itemCreated"),
  itemKind: z.enum(["period", "event", "scene"]),
  tone: toneValidator,
  text: z.string(),
});

const legacyCreatedMessageValidator = z.object({
  kind: z.literal("legacyCreated"),
  text: z.string(),
});

/**
 * Creations reach the chat log; edits, moves and deletions don't. What the
 * table wants a record of is *someone made a thing and we all have to live with
 * it* — the moment the game is built out of. A running commentary on somebody
 * fixing a typo is not that.
 *
 * Palette entries are the deliberate exception among creations: they're agreed
 * in a burst during setup, and a dozen chat lines before play has started is
 * noise rather than a record.
 */
export const microscopeMessageValidator = z.discriminatedUnion("kind", [
  itemCreatedMessageValidator,
  legacyCreatedMessageValidator,
]);

/**
 * Microscope: a structured notepad for the accumulating state of a game of
 * Microscope, by Ben Robbins. It records a history; it does not referee one.
 * Whose turn it is, what the round's Focus is, and who holds the Lens are all
 * left at the table where they belong — as is the rule that history may never
 * be contradicted, which is why anyone here can edit or delete anything.
 */
export const microscopeCommon = createCapabilityCommon({
  name: "microscope",
  displayName: "Microscope",
  visibility: "public",
  messageDataValidator: microscopeMessageValidator,
  state: {
    validator: microscopeStateValidator,
    getInitialState: getInitialMicroscopeState,
  },
  buildActions: ({ createAction }) => ({
    setBigPicture: createAction({
      payloadValidator: z.object({
        text: z.string().trim().max(MAX_TEXT_LENGTH),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.bigPicture = payload.text;
      },
    }),

    // Pure *and* effectful: the insert is a deterministic function of state and
    // payload, so it can be predicted locally, while the checks that need
    // authority (id not already taken, room not full) and the chat message both
    // live server-side. The effect calls this same `pureFn` once it's happy.
    createItem: createAction({
      payloadValidator: createItemPayloadValidator,
      pureFn: ({ stateDraft, payload }) => {
        if (!canAddTimelineItem(stateDraft)) {
          return;
        }
        // A duplicate id could only come from a broken or hostile client, but
        // two cards sharing one would collide on React's `key` and — worse —
        // make every later edit and delete ambiguous.
        if (findItem(stateDraft, payload.id) !== undefined) {
          return;
        }
        const slot = resolvePlacement(stateDraft, payload.placement);
        if (slot === undefined) {
          return;
        }
        const { id, tone, text } = payload;
        switch (slot.kind) {
          case "period":
            insertAt(slot.siblings, slot.index, { id, tone, text, events: [] });
            break;
          case "event":
            insertAt(slot.siblings, slot.index, { id, tone, text, scenes: [] });
            break;
          case "scene":
            insertAt(slot.siblings, slot.index, {
              id,
              tone,
              question: text,
              answer: "",
            });
            break;
        }
      },
    }),

    editItem: createAction({
      payloadValidator: editItemPayloadValidator,
      pureFn: ({ stateDraft, payload }) => {
        const slot = findItem(stateDraft, payload.id);
        if (slot === undefined) {
          return;
        }
        const item = slot.siblings[slot.index];
        item.tone = payload.tone;
        if (slot.kind === "scene") {
          const scene = slot.siblings[slot.index];
          scene.question = payload.text;
          // Absent means "not edited here" rather than "cleared": the create
          // dialog has no Answer field, and neither do the two levels that
          // aren't Scenes.
          if (payload.answer !== undefined) {
            scene.answer = payload.answer;
          }
        } else {
          slot.siblings[slot.index].text = payload.text;
        }
      },
    }),

    moveItem: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        placement: placementValidator,
      }),
      pureFn: ({ stateDraft, payload }) => {
        const from = findItem(stateDraft, payload.id);
        if (from === undefined) {
          return;
        }
        const to = resolvePlacement(stateDraft, payload.placement);
        if (to === undefined) {
          return;
        }
        // A Period can only be placed among Periods, so an item can never be
        // moved inside itself — the levels rule that out before any cycle check
        // could. This only rejects a move to the wrong level, which means a
        // caller working from stale state.
        switch (from.kind) {
          case "period":
            if (to.kind !== "period") return;
            relocate(from.siblings, from.index, to.siblings, to.index);
            break;
          case "event":
            if (to.kind !== "event") return;
            relocate(from.siblings, from.index, to.siblings, to.index);
            break;
          case "scene":
            if (to.kind !== "scene") return;
            relocate(from.siblings, from.index, to.siblings, to.index);
            break;
        }
      },
    }),

    /** Takes the item's whole subtree with it. */
    deleteItem: createAction({
      payloadValidator: z.object({ id: z.nanoid() }),
      pureFn: ({ stateDraft, payload }) => {
        const slot = findItem(stateDraft, payload.id);
        if (slot === undefined) {
          return;
        }
        removeAt(slot.siblings, slot.index);
      },
    }),

    createLegacy: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        text: itemTextValidator,
      }),
      pureFn: ({ stateDraft, payload }) => {
        if (stateDraft.legacies.length >= MAX_LEGACIES) {
          return;
        }
        if (stateDraft.legacies.some((legacy) => legacy.id === payload.id)) {
          return;
        }
        stateDraft.legacies.push({ id: payload.id, text: payload.text });
      },
    }),

    editLegacy: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        text: itemTextValidator,
      }),
      pureFn: ({ stateDraft, payload }) => {
        const legacy = stateDraft.legacies.find(
          (candidate) => candidate.id === payload.id,
        );
        if (legacy === undefined) {
          return;
        }
        legacy.text = payload.text;
      },
    }),

    deleteLegacy: createAction({
      payloadValidator: z.object({ id: z.nanoid() }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.legacies = stateDraft.legacies.filter(
          (legacy) => legacy.id !== payload.id,
        );
      },
    }),

    addPaletteEntry: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        list: z.enum(["yes", "no"]),
        text: itemTextValidator,
      }),
      pureFn: ({ stateDraft, payload }) => {
        const list = stateDraft.palette[payload.list];
        if (list.length >= MAX_PALETTE_ENTRIES) {
          return;
        }
        if (list.some((entry) => entry.id === payload.id)) {
          return;
        }
        list.push({ id: payload.id, text: payload.text });
      },
    }),

    removePaletteEntry: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        list: z.enum(["yes", "no"]),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.palette[payload.list] = stateDraft.palette[
          payload.list
        ].filter((entry) => entry.id !== payload.id);
      },
    }),

    /** Abandons the history completely and returns to a blank sheet. */
    resetGame: createAction({
      payloadValidator: z.object({}),
      pureFn: ({ stateDraft }) => {
        Object.assign(stateDraft, getInitialMicroscopeState());
      },
    }),
  }),
});
