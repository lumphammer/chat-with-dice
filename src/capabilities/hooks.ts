import type { OnlineUser } from "#/workers/ChatRoomDO/types";

/**
 * The single source of truth for capability hooks: a map from hook name to the
 * event payload it fires with. Everything else (definition handler types, the
 * mounted-capability dispatcher, the `CapabilityService` surface) is derived
 * from this map by `keyof` / indexed access, so adding a hook here is the only
 * place a new event shape is declared.
 *
 * Unlike action payloads, hook events need no zod validators: they are
 * constructed server-side by trusted DO code, never received over the wire.
 *
 * This is a SERVER-ONLY module — hooks only exist on server capabilities, and
 * it imports worker-side types. Nothing in the client bundle should import it.
 */
export type CapabilityHookEvents = {
  /**
   * Fired whenever the set of connected users changes (connect, clean
   * disconnect, or liveness-sweep eviction). Level-triggered: always carries
   * the full current online list, never a delta. Presence here is derived
   * state, so there is no honest "join"/"leave" edge to emit.
   */
  onPresenceChange: { online: OnlineUser[] };
};

/**
 * Runtime list of hook names, used by `CapabilityService` to build its
 * dispatcher object (there is no zod schema to read keys off). The `satisfies`
 * keeps this in lock-step with `CapabilityHookEvents` — adding to one without
 * the other is a type error.
 */
export const hookNames = ["onPresenceChange"] as const satisfies ReadonlyArray<
  keyof CapabilityHookEvents
>;
