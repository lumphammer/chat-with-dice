import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

// TERMINOLOGY
// SAFETY SIGNAL: a room-wide interrupt raised by a Room Participant. Two kinds:
//   X CARD (stop, rewind, move on) and PAUSE (hold on a moment).
// UNATTRIBUTED: a Safety Signal raised without recording who raised it. Shown
//   to users as "anonymous" — the plainer word — but kept distinct in code from
//   better-auth's `isAnonymous`, which means a guest account and is unrelated:
//   a signed-in user can raise an Unattributed signal, and a guest can raise an
//   attributed one.
// AVOIDED SUBJECT: one subject a participant has asked the table to steer clear
//   of. The room sees the pooled list; authorship never leaves the server.

/**
 * Sentinel author for an Unattributed Safety Signal. `Messages.userId` and
 * `Messages.displayName` are NOT NULL, so an unattributed signal is stored with
 * these rather than with nulls, and the raiser's real id is never written at
 * all — it exists for the lifetime of one WebSocket frame and is discarded.
 *
 * Not a real user id, and must never collide with one. Its only jobs are to
 * give `ChatBubble` something to derive a bubble colour from (so every
 * unattributed signal gets the same non-identifying hue) and to guarantee the
 * message never matches a viewer's own id and renders as theirs.
 */
export const UNATTRIBUTED_USER_ID = "__unattributed__";

/** User-visible, hence the plainer "Anonymous" rather than the code term. */
export const UNATTRIBUTED_DISPLAY_NAME = "Anonymous";

export const AVOIDED_SUBJECT_MAX_LENGTH = 200;

const signalKindValidator = z.enum(["xcard", "pause"]);

export type SignalKind = z.infer<typeof signalKindValidator>;

/**
 * The chat-log record of one Safety Signal. `unattributed` is kept on the
 * message so the display can say so explicitly rather than leaving the reader to
 * infer it from the author name.
 */
export const safetySignalMessageValidator = z.object({
  kind: signalKindValidator,
  unattributed: z.boolean(),
});

export type SafetySignalMessageData = z.infer<
  typeof safetySignalMessageValidator
>;

/**
 * One Avoided Subject as a client sees it. `isMine` is written per viewer by the
 * server's projection and is the *only* thing distinguishing your own entries
 * from the table's — nothing else about authorship is ever sent.
 */
const clientAvoidedSubjectValidator = z.object({
  id: z.nanoid(),
  text: z.string().min(1).max(AVOIDED_SUBJECT_MAX_LENGTH),
  isMine: z.boolean().default(false),
});

/**
 * The stored shape. `authorUserId` is SERVER-ONLY and never leaves the DO: the
 * capability's `projectState` deletes it, and `clientSafetyStateValidator`
 * (which omits it) strips it again on the way out, so forgetting the projection
 * cannot leak it.
 *
 * It is optional here only so that the projection's own output still satisfies
 * this validator. Treat "optional" as "absent once it has left the server",
 * never as "sometimes we don't know the author".
 */
const avoidedSubjectValidator = clientAvoidedSubjectValidator.extend({
  authorUserId: z.string().optional(),
});

export type AvoidedSubject = z.infer<typeof avoidedSubjectValidator>;

const lastSignalValidator = z
  .object({
    id: z.nanoid(),
    kind: signalKindValidator,
    createdTime: z.int(),
  })
  .nullable();

/**
 * `lastSignal` is what drives the room overlay: clients watch it for a change
 * of `id` rather than watching the chat log, so a reconnect or a scrolled-away
 * log can't cause a missed or replayed interrupt. It deliberately carries no
 * author — an Unattributed signal has to be indistinguishable here too.
 */
export const safetyStateValidator = z.object({
  entries: z.array(avoidedSubjectValidator),
  lastSignal: lastSignalValidator,
});

/**
 * What clients are allowed to receive. Handed to the kernel as
 * `clientStateValidator`, which parses every outgoing state through it; zod
 * strips unknown keys, so a field's absence *here* is what makes it unsendable.
 */
export const clientSafetyStateValidator = z.object({
  entries: z.array(clientAvoidedSubjectValidator),
  lastSignal: lastSignalValidator,
});

export type SafetyState = z.infer<typeof safetyStateValidator>;

/**
 * Safety Tools: an X Card and a Pause anyone can raise (optionally without
 * their name attached), and a per-room Avoid List whose entries are pooled and
 * shown without authorship.
 *
 * Mounted on every room — a safety tool a room owner can switch off is not much
 * of a safety tool — so it declares no config and never appears in the room
 * config toggles.
 */
export const safetyCommon = createCapabilityCommon({
  name: "safety",
  displayName: "Safety tools",
  visibility: "always",
  messageDataValidator: safetySignalMessageValidator,
  state: {
    validator: safetyStateValidator,
    getInitialState: () => ({ entries: [], lastSignal: null }),
  },
  buildActions: ({ createAction }) => ({
    raiseSignal: createAction({
      // No `pureFn`: the signal's id and timestamp are minted server-side, so
      // there is no local transition to predict (cf. `cards.draw`).
      payloadValidator: z.object({
        kind: signalKindValidator,
        unattributed: z.boolean(),
      }),
    }),
    addAvoidedSubject: createAction({
      // `id` is minted by the client so the optimistic push and the stored
      // entry agree on identity, as `havoc` does for its own ids.
      payloadValidator: z.object({
        id: z.nanoid(),
        text: z.string().min(1).max(AVOIDED_SUBJECT_MAX_LENGTH),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.entries.push({
          id: payload.id,
          text: payload.text,
          isMine: true,
        });
      },
    }),
    removeAvoidedSubject: createAction({
      payloadValidator: z.object({ id: z.nanoid() }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.entries = stateDraft.entries.filter(
          (entry) => entry.id !== payload.id,
        );
      },
    }),
  }),
});
