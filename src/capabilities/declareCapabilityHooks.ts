import type { CapabilityName } from "./capabilityNames";

/**
 * Declares the hooks a capability fires, constraining every key to the
 * `<capability>:<hookName>` form. Two capabilities therefore cannot collide on
 * a hook name, and a hook's owner is readable wherever it is fired or handled.
 *
 * Used in `<capability>/hooks.ts`, which must stay an import leaf — the
 * composed `CapabilityHookEvents` map imports those modules, so anything they
 * import back from the kernel would close a type cycle. That is why this helper
 * lives here rather than alongside the map.
 *
 * Room-level hooks fired by the DO itself carry no prefix and are declared
 * directly in `hooks.ts`.
 */
export type DeclareCapabilityHooks<
  TCapability extends CapabilityName,
  TEvents extends Record<`${TCapability}:${string}`, unknown>,
> = TEvents;
