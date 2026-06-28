import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import type { CapabilityHookEvents } from "#/capabilities/hooks";
import { hookNames } from "#/capabilities/hooks";

/**
 * Per-hook dispatcher surface: `service.hooks.onPresenceChange(event)` fans the
 * event out to every mounted capability that declares a handler for it.
 */
type HookDispatchers = {
  [K in keyof CapabilityHookEvents]: (
    event: CapabilityHookEvents[K],
  ) => Promise<void>;
};

/**
 * Service object the DO passes around so back-end code can drive capability
 * hooks without reaching into the mounted-capability map directly. Holds a
 * reference to the DO's live capabilities map, so caps mounted/unmounted on a
 * config change are picked up automatically.
 */
export class CapabilityService {
  readonly hooks: HookDispatchers;

  constructor(private capabilities: Map<string, ServerMountedCapability>) {
    // Built from the runtime `hookNames` list (there is no zod schema to read
    // keys off). The `Object.fromEntries` round-trip loses the precise per-key
    // mapping, so we re-assert it here — the keys come straight from
    // `hookNames`, so this is sound.
    this.hooks = Object.fromEntries(
      hookNames.map((name) => [
        name,
        (event: CapabilityHookEvents[typeof name]) =>
          this.dispatch(name, event),
      ]),
    ) as HookDispatchers;
  }

  /**
   * Run a hook on every mounted capability. Capabilities each own independent
   * state, so they run in parallel; ones without a handler for the hook no-op.
   */
  private async dispatch<K extends keyof CapabilityHookEvents>(
    name: K,
    event: CapabilityHookEvents[K],
  ): Promise<void> {
    await Promise.all(
      [...this.capabilities.values()].map((capability) =>
        capability.runHook(name, event),
      ),
    );
  }
}
