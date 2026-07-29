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

/**
 * A backstop, not a UX limit — a real table of six will not come close. It
 * exists because the Avoid List lives in capability state, and capability state
 * is rebroadcast to every socket in the room in full on every change, so an
 * unbounded list is an unbounded broadcast for everyone else.
 */
export const MAX_AVOIDED_SUBJECTS = 100;

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
 * One Avoided Subject. Attributed: the whole room sees who asked for it, the
 * same way a table would if you said it out loud or wrote it on a shared sheet
 * (ADR-0003).
 *
 * `authorDisplayName` is a snapshot taken when the entry was added, matching how
 * `ChatMessage.displayName` records the name as it was at the time. A later
 * rename leaves older entries reading as they did when written, and saves every
 * client having to resolve ids against the `users` capability to draw a list.
 */
const avoidedSubjectValidator = z.object({
  id: z.nanoid(),
  // `.trim()` before the length checks, so " " is rejected rather than stored as
  // a blank-looking row. The sidebar trims too, but the sidebar is not the only
  // thing that can send this action.
  text: z.string().trim().min(1).max(AVOIDED_SUBJECT_MAX_LENGTH),
  authorUserId: z.string(),
  authorDisplayName: z.string(),
});

export type AvoidedSubject = z.infer<typeof avoidedSubjectValidator>;

const lastSignalValidator = z
  .object({
    id: z.nanoid(),
    kind: signalKindValidator,
    createdTime: z.int(),
    /**
     * The name to show on the interrupt: the raiser's, or the sentinel's when
     * the signal is Unattributed. This is the *attributed* name, never the name
     * behind it — for an Unattributed signal the real one is discarded along
     * with the rest of the raiser's identity, so there is nothing here to leak.
     *
     * Defaulted rather than required: a signal recorded before this field
     * existed has no name to show, and falling back to the anonymous label is
     * the safe direction, because it never attributes a signal to someone who
     * did not raise it. A required field would also fail the whole state parse
     * and take that room's Avoid List down with it, since `mount` responds to a
     * failed parse by falling back to `getInitialState`.
     */
    displayName: z.string().default(UNATTRIBUTED_DISPLAY_NAME),
  })
  .nullable();

/**
 * `lastSignal` is what drives the room overlay: clients watch it for a change
 * of `id` rather than watching the chat log, so a reconnect or a scrolled-away
 * log can't cause a missed or replayed interrupt. It carries no *identity* —
 * only the attributed name, which for an Unattributed signal is the same
 * constant for everyone, so one signal still cannot be told from another here.
 */
export const safetyStateValidator = z.object({
  entries: z.array(avoidedSubjectValidator),
  lastSignal: lastSignalValidator,
});

export type SafetyState = z.infer<typeof safetyStateValidator>;

/**
 * Safety Tools: an X Card and a Pause anyone can raise (optionally without
 * their name attached), and a per-room Avoid List whose entries carry their
 * author's name.
 *
 * The two differ deliberately. A signal is a momentary interrupt and can be
 * raised anonymously, because in the moment the cost of being seen to raise one
 * is exactly what stops people raising it. An Avoided Subject is a session-zero
 * statement, and attributing it matches what a table does out loud (ADR-0003).
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
      // `id` is minted by the client so a later removal can name the entry
      // without waiting to learn a server-assigned one.
      //
      // No `pureFn`: the author is stamped server-side from the connection, and
      // predicting the entry locally would mean either trusting a client-supplied
      // name or flashing a blank one until the round trip lands. The server owns
      // part of the value, so there is nothing honest to predict (cf.
      // `cards.draw`).
      payloadValidator: z.object({
        id: z.nanoid(),
        text: z.string().trim().min(1).max(AVOIDED_SUBJECT_MAX_LENGTH),
      }),
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
