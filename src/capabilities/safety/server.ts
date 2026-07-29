import { createServerCapability } from "#/capabilities/createServerCapability";
import {
  MAX_AVOIDED_SUBJECTS,
  safetyCommon,
  UNATTRIBUTED_DISPLAY_NAME,
  UNATTRIBUTED_USER_ID,
} from "./common";
import { nanoid } from "nanoid";

export const safetyServer = createServerCapability(safetyCommon, {
  actionEffects: {
    raiseSignal: ({
      payload,
      userId,
      displayName,
      sendChatMessage,
      stateDraft,
    }) => {
      // For an unattributed signal this is the only place the raiser's identity
      // could have been recorded, and it isn't: the sentinel goes to the message
      // store, `userId` goes out of scope, and nothing else in this effect sees
      // it. There is deliberately no audit trail to consult later.
      //
      // Both the chat message and the overlay's name are derived from this one
      // value. Building them separately would let a later edit drift them apart,
      // and a chat log saying "Anonymous" beside an interrupt naming a person is
      // exactly how an unattributed raiser gets exposed.
      const attribution = payload.unattributed
        ? {
            userId: UNATTRIBUTED_USER_ID,
            displayName: UNATTRIBUTED_DISPLAY_NAME,
          }
        : { userId, displayName };

      sendChatMessage(
        { kind: payload.kind, unattributed: payload.unattributed },
        attribution,
      );
      stateDraft.lastSignal = {
        id: nanoid(),
        kind: payload.kind,
        createdTime: Date.now(),
        // Only the name. `attribution.userId` stays out of state — the overlay
        // needs something to display, not something to identify with.
        displayName: attribution.displayName,
      };
    },
    addAvoidedSubject: ({
      stateDraft,
      payload,
      userId,
      displayName,
      broadcaster,
    }) => {
      // The id is the client's to mint, which means it is also the client's to
      // get wrong. Two entries sharing one id would collide on React's `key` and
      // — worse — `removeAvoidedSubject` filters by id, so removing either would
      // silently take both. Nothing useful to report: a duplicate can only come
      // from a buggy or hostile client, never from the sidebar.
      if (stateDraft.entries.some((entry) => entry.id === payload.id)) {
        return;
      }
      if (stateDraft.entries.length >= MAX_AVOIDED_SUBJECTS) {
        // Worth telling this user about, unlike the duplicate above: a real
        // table could in principle reach the cap, and silence would just look
        // like the Add button was broken.
        broadcaster.sendErrorToUserId(
          userId,
          new Error(
            `This room already has ${MAX_AVOIDED_SUBJECTS} subjects to avoid. Remove one before adding another.`,
          ),
        );
        return;
      }
      // Author comes from the connection, never from the payload — a client
      // cannot add a subject in somebody else's name. Only `id` and `text` are
      // the caller's to supply.
      stateDraft.entries.push({
        id: payload.id,
        text: payload.text,
        authorUserId: userId,
        authorDisplayName: displayName,
      });
    },
    removeAvoidedSubject: async ({
      pureFn,
      stateDraft,
      payload,
      userId,
      getRoomOwnerUserId,
    }) => {
      // An entry is removable by its author or by the room owner, and by nobody
      // else. The sidebar only offers the control to those two; this is what
      // actually enforces it. Rejecting still broadcasts — correlated changes
      // always do — so a hostile client's optimistic removal snaps back.
      const entry = stateDraft.entries.find(
        (candidate) => candidate.id === payload.id,
      );
      if (!entry) {
        return;
      }
      if (entry.authorUserId !== userId) {
        // Only worth a D1 round trip once the free check has failed. An
        // unreadable room row yields `undefined`, which matches no real user
        // id, so an unknown owner fails closed rather than open.
        const roomOwnerUserId = await getRoomOwnerUserId();
        if (userId !== roomOwnerUserId) {
          return;
        }
      }
      pureFn({ stateDraft, payload });
    },
  },
});
