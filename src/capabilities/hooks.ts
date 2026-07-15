import type { OnlineUser } from "#/workers/ChatRoomDO/types";
import type { FilesHookEvents } from "./files/hooks";

/**
 * Hooks fired by the DO itself rather than by a capability, so they carry no
 * `<capability>:` prefix.
 */
type RoomHookEvents = {
  /**
   * Fired whenever the set of connected users changes (connect, clean
   * disconnect, or liveness-sweep eviction). Level-triggered: always carries
   * the full current online list, never a delta. Presence here is derived
   * state, so there is no honest "join"/"leave" edge to emit.
   */
  onPresenceChange: { online: OnlineUser[] };
  /**
   * Fired when an owner's file store reports that shared nodes have become
   * viewable or stopped being viewable from this room — because the owner
   * binned or restored the node, or an ancestor of it.
   *
   * This is *not* unsharing: the grant survives, because soft delete is
   * reversible. Anything holding state derived from a share should hide it
   * rather than forget it, or a restore will have nothing to bring back.
   *
   * Carries only the nodes whose availability actually changed, so it is
   * edge-triggered rather than level-triggered — the owner's store may hold
   * thousands of nodes and the room has no use for the rest.
   */
  onShareAvailabilityChange: {
    changes: { ownerUserId: string; nodeId: string; unavailable: boolean }[];
  };
};

/**
 * The single source of truth for capability hooks: a map from hook name to the
 * event payload it fires with. Everything else (definition handler types, the
 * mounted-capability dispatcher, the `CapabilityService` surface) is derived
 * from this map by `keyof` / indexed access, so this is the only place a new
 * event shape enters the system.
 *
 * Capability-fired hooks are declared in `<capability>/hooks.ts` — next to the
 * code that fires them — and composed in here. Those modules are import leaves
 * so that this stays a DAG: leaf -> this map -> `createServerCapability` ->
 * `<capability>/server.ts` -> registry. Deriving the map from the registry
 * instead would close that loop; see ADR-0002.
 *
 * Unlike action payloads, hook events need no zod validators: they are
 * constructed server-side by trusted DO code, never received over the wire.
 *
 * This is a SERVER-ONLY module — hooks only exist on server capabilities, and
 * it imports worker-side types. Nothing in the client bundle should import it.
 */
export type CapabilityHookEvents = RoomHookEvents & FilesHookEvents;

/**
 * Every hook name, as a Record so the key set is exhaustive by construction:
 * omitting a name declared in `CapabilityHookEvents` is a type error here.
 *
 * It has to be a Record rather than the more natural array. `[...] as const
 * satisfies ReadonlyArray<keyof CapabilityHookEvents>` only checks that each
 * element *is* a key, not that every key is present — so a hook added to the
 * map but not the list would silently get no dispatcher in `CapabilityService`
 * and could never fire, with nothing to catch it.
 */
const hookRegistry: Record<keyof CapabilityHookEvents, true> = {
  onPresenceChange: true,
  onShareAvailabilityChange: true,
  "files:onShareRemoved": true,
};

/**
 * Runtime list of hook names, used by `CapabilityService` to build its
 * dispatcher object (there is no zod schema to read keys off). `Object.keys`
 * widens to `string[]`, so we re-assert the key type — sound, because
 * `hookRegistry` is typed to exactly this key set.
 */
export const hookNames = Object.keys(
  hookRegistry,
) as (keyof CapabilityHookEvents)[];

/**
 * Fires a hook at every mounted capability. Handed to capabilities at mount so
 * their action effects can fire hooks; implemented by `CapabilityService`.
 */
export type HookDispatch = <K extends keyof CapabilityHookEvents>(
  name: K,
  event: CapabilityHookEvents[K],
) => Promise<void>;

/**
 * The `fireHook` handed to an action effect. Returns void rather than a
 * promise: the call is queued and flushed once the effect's state change has
 * committed (see `createServerCapability`), so there is nothing meaningful to
 * await. Handler errors are swallowed per-capability by `runHook` regardless.
 */
export type FireHook = <K extends keyof CapabilityHookEvents>(
  name: K,
  event: CapabilityHookEvents[K],
) => void;
