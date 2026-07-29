# 3. Per-viewer capability state

Status: accepted

## Context

Safety Tools introduces the Avoid List: each Room Participant enters subjects
they would rather the game steered clear of, and the Room sees the pooled list
with no authorship. Authorship still has to exist somewhere, because only an
entry's author may remove it.

Capability state has one delivery path and it is wholesale.
`createServerCapability#applyStateChange` finishes its immer draft, persists,
and calls `Broadcaster#broadcast` with one payload for every socket;
`getInitPayload` hands the same object to each newly-connected client. Anything a
capability stores is therefore visible to every participant with dev tools open.
Storing `authorUserId` on an entry under that arrangement would broadcast it.

Two other shapes were considered and rejected:

- **An authorless list plus client-side ownership.** Store `{ id, text }` with no
  author at all — safe to broadcast wholesale, zero kernel change — and have each
  client remember the ids it created in `localStorage`. It fails on two counts:
  any participant can then remove anyone's entry, which is a poor property for a
  safety tool; and your own entries read as strangers' on a second device or
  after clearing storage.
- **Author held in a parallel server-only KV key.** Keeps authorship off the
  broadcast, but `CapabilityStateRepository` keys strictly by capability name,
  and the client would still have no way to learn which entries were its own.

## Decision

**A capability may declare how its state looks to one viewer, and what any
viewer is allowed to see at all.**

1. **`projectState` rewrites the state per viewer.** Declared on the _server_
   half, so the unredacted shape cannot reach the client bundle. It takes
   `{ state, viewerUserId }` and returns the same type, because redaction here is
   field-level rather than shape-level. `safety` uses it to swap stored
   `authorUserId` for a per-viewer `isMine`.

2. **`clientStateValidator` is what actually enforces the boundary.** Every
   outgoing state is parsed through it immediately before broadcast. Zod strips
   unknown keys, so a field's _absence from this validator_ is what makes it
   unsendable — not its deletion in `projectState`.

   This split matters more than it looks. `projectState` returns the type it was
   handed, so `({ state }) => state` type-checks, and a real projection can lose
   its redaction to a careless edit with nothing complaining. The type system
   cannot close that hole (see consequences), so the guarantee is a runtime strip
   and a test that runs with the projection deliberately set to the identity
   function.

3. **`Broadcaster` gains the per-socket path, and only capabilities that need it
   pay for it.** `broadcastCapabilityStatePerViewer` iterates open sockets,
   reads each attachment's `userId`, and sends a payload built for that viewer.
   A capability declaring no `projectState` still takes the single-payload
   `broadcast`, including one that declares only a `clientStateValidator` — that
   strip is uniform across viewers, so there is nothing to vary. Sockets whose
   attachment fails to parse are skipped rather than sent a shared payload:
   "we don't know who this is" must never degrade into "send them everything".

4. **`getInitPayload` takes the viewer.** It was already called per-socket from
   `handleFetch`, which has the `userId` to hand, so it is passed explicitly
   rather than re-derived from the attachment. `broadcastCapabilityInit` (config
   changes) reads it from each socket, as the state path does.

5. **We do not fork the kernel into stored-state and client-state types.** A
   `TClientStateValidator` generic defaulting to `TStateValidator` would leave
   every existing capability compiling untouched, so this stays available later.
   It is not done now because the payoff is smaller than it appears:

   - `pureFn` straddles both sides — the server applies it to the stored draft,
     the client to received state for optimistic updates — so `pureFn` must be
     typed against the client state and `ServerState` must be structurally
     assignable to `ClientState`. Fields `pureFn` writes (`isMine`) therefore
     have to exist on both sides regardless; only server-written fields
     (`authorUserId`) could ever become server-only.
   - That same assignability makes an identity `projectState` type-check under a
     fork too, so a fork would still need the runtime strip. It buys nicer types,
     not the guarantee.

   `pureFn` being bilateral is worth keeping: most capabilities want the same
   state on both sides, and sharing the transition is what makes optimistic
   updates free.

## Consequences

- A server-only field is `.optional()` on the state validator, deleted by
  `projectState`, and absent from `clientStateValidator`. Only the third is
  load-bearing; the first two are for readability.
- **`safety` should stay the only capability using this idiom.** One consumer is
  what keeps the eventual type fork a contained migration; several would turn it
  into a sweep. A second capability wanting per-viewer state is the signal to do
  the fork rather than to copy the pattern again.
- `projectState` runs once per connected socket per state change, and
  `clientStateValidator.parse` runs on every outgoing state. Both are cheap at
  the room sizes this app supports (`MAX_ACTIVE_CONNECTIONS` is 100), but neither
  is free, which is why the non-projecting path stays a single `broadcast`.
- A rejected action still broadcasts, because correlated changes always do. That
  is what makes server-side authorisation of `removeAvoidedSubject` safe against
  a hostile client: its optimistic removal snaps back when the uncorrected state
  arrives.
- Anonymity here is about what is recorded, not what can be inferred. Timing in a
  small room can still give a raiser away; nothing in this decision claims
  otherwise.
