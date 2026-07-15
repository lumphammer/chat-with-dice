# 2. Capability-declared hooks

Status: accepted

## Context

ADR-0001 decides that a Pile is dropped when its Deck is unshared. Unsharing happens inside the `files` capability's `unshareFile` action effect, so the `cards` capability has to react to another capability's action.

The kernel already has hooks: `CapabilityHookEvents` in `src/capabilities/hooks.ts` maps a hook name to its event payload, `CapabilityService` builds a dispatcher per hook and fans each event out to every mounted capability, and a capability opts in by declaring a handler. Today there is exactly one hook, `onPresenceChange`, fired by the DO and consumed by `users`.

Two things are missing: capabilities can only _consume_ hooks, not fire them; and every event type must be declared centrally, away from the capability that owns it.

The central map is not incidental. `ServerMountedCapability.runHook` is typed against it precisely so it survives the type-erased `Map<string, ServerMountedCapability>` the DO holds. Any redesign has to keep a single composed map.

## Decision

**Capabilities declare their own hooks in leaf modules; the central map composes them.**

1. **Each capability's hook events live in `<capability>/hooks.ts`**, which imports nothing from the kernel. `capabilities/hooks.ts` composes those leaves into the one `CapabilityHookEvents` map. The import graph stays a DAG: leaf → composed map → `createServerCapability` → `<capability>/server.ts` → registry.

   We compose rather than _derive from the registry_. Deriving would mean `createServerCapability` importing the registry to type its own `hooks` block, while the registry imports every `server.ts`, which imports `createServerCapability`. The type-only edge erases at runtime, but it asks TypeScript to resolve `CapabilityHookEvents` through a capability's inferred type through `createServerCapability`'s own parameter types — the class of cycle that works until it silently degrades to `any`. It would also require the registry to stop annotating as `Record<CapabilityName, ServerCapability>`, since that erasure is exactly what discards the per-capability hook types. Composing costs one line per hook and avoids all of it.

2. **Capability-fired hooks are named `<capability>:<hookName>`**, enforced at declaration by `DeclareCapabilityHooks`, a template-literal-typed helper. The owner of a hook is then readable at every call site, and two capabilities cannot collide on a name. Room-level hooks fired by the DO itself (`onPresenceChange`) keep bare names.

3. **Fired hooks are queued during an action effect and flushed after the state change commits.** `applyStateChange` opens an immer draft, runs the effect, then finishes the draft and persists. Dispatching synchronously would let a hook land back on the originating capability while its draft is still open, giving two live drafts over one state and a lost update on the second `finishDraft`. Cross-capability dispatch is safe — separate states, separate KV keys — but nothing structurally prevented the bad case.

   Queuing also gives the right failure semantics for free: `unshareFile` bails early on error, so a queued hook simply never flushes, and the same holds if an effect throws.

   The flush happens in `onMessage`, _after_ the mount closure's `state` has been reassigned from `handleMessage`. Flushing inside `applyStateChange` would dispatch while `state` still held the pre-action value, so any handler re-entering the firing capability would read stale state.

4. **`fireHook` returns void.** It cannot be meaningfully awaited once deferred, and this matches how hooks already work — `runHook` swallows handler errors precisely because callers do not await.

5. **Hook handlers cannot fire hooks.** `fireHook` is threaded into action effects only. Handler-fires-handler is a cascade risk with no current use case; it can be added if one appears.

6. **The dispatcher is exhaustive by construction.** The previous invariant was broken: `["onPresenceChange"] as const satisfies ReadonlyArray<keyof CapabilityHookEvents>` only checks that each element _is_ a valid key, not that _all_ keys are present — so the comment claiming "adding to one without the other is a type error" only held in one direction. With one hook that was harmless. Once capabilities declare their own, a name missing from the list means `CapabilityService` silently builds no dispatcher, the hook can never fire, and nothing errors. A `Record<keyof CapabilityHookEvents, true>` read via `Object.keys` does force every key.

## Consequences

- Adding a hook to a capability is: declare the event in its `hooks.ts`, add one line to the composed map, add one line to the registry. The `Record` makes forgetting the last one a type error.
- `dispatch` still fans out to every mounted capability, including the one that fired. A capability handling its own hook is a smell, but post-commit flushing makes it safe rather than corrupting, so we do not exclude the sender.
- `files:onShareRemoved` fires with `{ ownerUserId, nodeId }` — the data available today. ADR-0001 needs `shareId` on it to key Piles; that arrives with the Files state version bump, alongside the `cards` work.
- The hook fires on any non-error unshare, including `not-found`, because the postcondition is the same: there is no share for that node in this Room, so a consumer should drop its derived state either way.
- This lands before any `cards` code, so the kernel change can be reviewed on its own.
