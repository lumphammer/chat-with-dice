import { createServerCapability } from "#/capabilities/createServerCapability";
import {
  MAX_LEGACIES,
  MAX_PALETTE_ENTRIES,
  MAX_TIMELINE_ITEMS,
  canAddTimelineItem,
  findItem,
  microscopeCommon,
  resolvePlacement,
} from "./common";

/**
 * The creating actions and the first edit that answers a Scene have a server
 * half. The rest are pure transitions with nothing to check: history here is
 * communal, so there is no author to compare a caller against, and nothing to
 * say beyond what the transition already does.
 *
 * Where an effect does exist it follows the same shape: fail the checks that
 * need authority, or call the shared `pureFn` and then say so in the chat log.
 * A refused action still broadcasts, so the caller's optimistic card comes back
 * off the screen on its own.
 */
export const microscopeServer = createServerCapability(microscopeCommon, {
  actionEffects: {
    createItem: ({
      stateDraft,
      payload,
      pureFn,
      sendChatMessage,
      broadcaster,
      userId,
    }) => {
      if (!canAddTimelineItem(stateDraft)) {
        broadcaster.sendErrorToUserId(
          userId,
          new Error(
            `This history has reached ${MAX_TIMELINE_ITEMS} items. Delete something before adding more.`,
          ),
        );
        return;
      }
      // Only a broken or hostile client can do this, so there is nothing worth
      // reporting: the sidebar mints a fresh id per card.
      if (findItem(stateDraft, payload.id) !== undefined) {
        return;
      }
      // Resolved here as well as inside `pureFn` — nothing mutates in between,
      // so the two agree — because the chat message needs to name the level,
      // and the level is a fact about the placement rather than the payload.
      const slot = resolvePlacement(stateDraft, payload.placement);
      if (slot === undefined) {
        // Someone deleted the card this one was going next to. Worth saying:
        // the optimistic insert no-ops for the same reason, so otherwise the
        // dialog just appears to have done nothing.
        broadcaster.sendErrorToUserId(
          userId,
          new Error(
            "That part of the timeline has gone — somebody deleted it. Try again.",
          ),
        );
        return;
      }
      pureFn({ stateDraft, payload });
      sendChatMessage({
        kind: "itemCreated",
        itemKind: slot.kind,
        tone: payload.tone,
        text: payload.text,
      });
    },

    createLegacy: ({
      stateDraft,
      payload,
      pureFn,
      sendChatMessage,
      broadcaster,
      userId,
    }) => {
      if (stateDraft.legacies.length >= MAX_LEGACIES) {
        broadcaster.sendErrorToUserId(
          userId,
          new Error(
            `This room already has ${MAX_LEGACIES} legacies. Remove one before adding another.`,
          ),
        );
        return;
      }
      if (stateDraft.legacies.some((legacy) => legacy.id === payload.id)) {
        return;
      }
      pureFn({ stateDraft, payload });
      sendChatMessage({ kind: "legacyCreated", text: payload.text });
    },

    editItem: ({ stateDraft, payload, pureFn, sendChatMessage }) => {
      const slot = findItem(stateDraft, payload.id);
      const isNewAnswer =
        slot?.kind === "scene" &&
        slot.siblings[slot.index].answer.trim() === "" &&
        payload.answer !== undefined &&
        payload.answer !== "";

      pureFn({ stateDraft, payload });

      if (isNewAnswer) {
        const updatedSlot = findItem(stateDraft, payload.id);
        if (updatedSlot?.kind === "scene") {
          const scene = updatedSlot.siblings[updatedSlot.index];
          sendChatMessage({
            kind: "sceneAnswered",
            question: scene.question,
            answer: scene.answer,
          });
        }
      }
    },

    // No chat message, unlike the other two creations: the palette is agreed in
    // a burst during setup, and a dozen lines in the log before play has begun
    // is noise rather than a record.
    addPaletteEntry: ({ stateDraft, payload, pureFn, broadcaster, userId }) => {
      if (stateDraft.palette[payload.list].length >= MAX_PALETTE_ENTRIES) {
        broadcaster.sendErrorToUserId(
          userId,
          new Error(
            `This room's ${payload.list === "yes" ? "Yes" : "No"} list is full at ${MAX_PALETTE_ENTRIES} entries.`,
          ),
        );
        return;
      }
      pureFn({ stateDraft, payload });
    },
  },
});
