import { createServerCapability } from "#/capabilities/createServerCapability";
import {
  clientSafetyStateValidator,
  safetyCommon,
  UNATTRIBUTED_DISPLAY_NAME,
  UNATTRIBUTED_USER_ID,
} from "./common";
import { nanoid } from "nanoid";

export const safetyServer = createServerCapability(safetyCommon, {
  clientStateValidator: clientSafetyStateValidator,
  // Replace stored authorship with a per-viewer "is this mine?" flag. The
  // `clientStateValidator` above strips `authorUserId` again on the way out, so
  // this function is the *readable* half of the redaction rather than the
  // load-bearing half — an identity projection here would still not leak.
  projectState: ({ state, viewerUserId }) => ({
    ...state,
    entries: state.entries.map(({ authorUserId, ...rest }) => ({
      ...rest,
      isMine: authorUserId === viewerUserId,
    })),
  }),
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
    addAvoidedSubject: ({ pureFn, stateDraft, payload, userId }) => {
      pureFn({ stateDraft, payload });
      const entry = stateDraft.entries.find(
        (candidate) => candidate.id === payload.id,
      );
      if (entry) {
        entry.authorUserId = userId;
        // Meaningless in storage — every client's value is written by
        // `projectState`. Kept false so the stored state claims nothing.
        entry.isMine = false;
      }
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
