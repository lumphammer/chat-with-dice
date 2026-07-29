# 3. Avoided Subjects are attributed

Status: accepted

## Context

Safety Tools has two halves that look alike and are not. A **Safety Signal** (X
Card, Pause) is a momentary interrupt raised mid-play. An **Avoided Subject** is
a session-zero statement that sits in the room for as long as the room does.

Signals can be raised **Unattributed**, and should be: in the moment, the cost of
being seen to raise one is the thing that stops people raising it. That is
cheaply done — the DO writes a sentinel author and discards the real id, via the
attribution override on the effect's `sendChatMessage`.

The Avoid List is a different question. An early version made it anonymous too,
which forced a much larger mechanism, because capability state has exactly one
delivery path and it is wholesale: `applyStateChange` broadcasts one payload to
every socket and `getInitPayload` hands the same object to each new client. Any
authorship a capability stores is visible to every participant with dev tools
open. Keeping authorship server-side while still letting each client see which
entries were its own therefore needed per-viewer state — a `projectState` hook on
the server capability, a `clientStateValidator` runtime strip, and a per-socket
broadcast path in `Broadcaster`.

That shipped and worked. It is being removed.

## Decision

**An Avoided Subject carries its author's id and display name, visible to the
whole room. Per-viewer capability state is removed from the kernel.**

1. **Attribution matches what tables actually do.** Lines and veils get raised
   out loud, or written on a shared sheet with names against them. Most VTTs
   ship no safety tooling at all, so an attributed list is not a regression
   against the field — and an attributed list people can talk about beats an
   anonymous one nobody can follow up on.

2. **A kernel primitive with one consumer is not a primitive.** ADR-0002's
   hook mechanism earns its keep across `files`, `cards` and `users`. Per-viewer
   state had exactly one consumer, and that consumer turned out not to need it.
   The previous version of this ADR said `safety` should stay its only user; the
   honest conclusion from that constraint is to delete it rather than protect it.

3. **The author is stamped from the connection, never the payload.** The action
   carries only `id` and `text`; `userId` and `displayName` come from the
   WebSocket attachment, so nobody can add a subject in someone else's name.

4. **`authorDisplayName` is a snapshot, not a live lookup.** Taken when the entry
   is added, matching `ChatMessage.displayName`. A later rename leaves older
   entries reading as they were written, and no client has to resolve ids against
   the `users` capability to draw a list.

5. **`addAvoidedSubject` has no `pureFn`.** The author is server-side, so an
   optimistic entry would either trust a client-supplied name or flash a blank
   one. There is nothing honest to predict, as with `cards.draw`. Removal keeps
   its `pureFn` — that transition is fully predictable, and a rejected removal
   snaps back when the correlated state arrives.

## What was kept

Three pieces from the anonymous design earn their place independently and stay:

- **The `sendChatMessage` attribution override**, which is what makes an
  Unattributed signal possible at all.
- **The `RoomOverlayComponent` slot** and `useMountedCapabilities`, which give a
  capability a place to put UI that must exist regardless of which sidebar tab
  is open.
- **`getRoomOwnerUserId` on action effects**, which is how owner-only powers get
  authorised server-side.

## Consequences

- `projectState`, `clientStateValidator`, `broadcastCapabilityStatePerViewer` and
  the per-viewer `getInitPayload(viewerUserId)` are gone. `getInitPayload` takes
  no argument again and `applyStateChange` broadcasts one payload.
- **Capability state is once again wholesale, with no exceptions.** Anything a
  capability stores is readable by every participant in the room. That is now an
  invariant rather than a default, and a future capability wanting to hold
  something private cannot simply store it.
- If per-viewer state is ever needed again, this ADR and its predecessor in git
  history record the shape it took and two findings worth not re-deriving:
  - `pureFn` is bilateral — the server applies it to the stored draft, the client
    to received state for optimistic updates — so any stored/client state split
    requires `ServerState` to be structurally assignable to `ClientState`, and
    only server-written fields can ever be server-only.
  - Types cannot enforce the redaction. `projectState` returns the type it was
    given, so an identity projection type-checks; a runtime strip through a
    client-facing validator is what actually holds the line. A stored/client type
    fork would still have needed it.
- Attribution is a real trade, not a free simplification. A persistent list with
  names on it asks more of someone adding a difficult subject than an anonymous
  one does. The mitigation is honesty rather than machinery: the add form says
  the room will see your name _before_ the input, not after it.
