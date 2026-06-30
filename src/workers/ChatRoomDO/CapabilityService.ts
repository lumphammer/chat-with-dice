import { isCapabilityName } from "#/capabilities/capabilityNames.ts";
import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import type { CapabilityHookEvents } from "#/capabilities/hooks";
import { hookNames } from "#/capabilities/hooks";
import { serverCapabilityRegistry } from "#/capabilities/serverCapabilityRegistry.ts";
import type { RoomConfig } from "#/validators/roomConfigValidator.ts";
import type { WebSocketClientMessage } from "#/validators/webSocketMessageSchemas.ts";
import type { Broadcaster } from "./Broadcaster";
import { CapabilityStateRepository } from "./CapabilityStateRepository";
import type { MessageJiggler } from "./MessageJiggler";
import { NodeShareManager } from "./NodeShareManager";
import { log, logError } from "./utils";

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
  private stateRepository!: CapabilityStateRepository;
  private nodeShareManager: NodeShareManager;
  public capabilities: Map<string, ServerMountedCapability> = new Map();

  constructor(
    private ctx: DurableObjectState,
    private messageJiggler: MessageJiggler,
    private broadcaster: Broadcaster,
    private roomId: string,
    private getUserId: () => Promise<string | undefined>,
    private getConfig: () => RoomConfig,
  ) {
    this.nodeShareManager = new NodeShareManager(ctx, this.roomId, () =>
      this.getUserId(),
    );
    this.stateRepository = new CapabilityStateRepository(ctx.storage.kv);

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

  private async mountCapability(
    name: string,
    config: unknown,
  ): Promise<ServerMountedCapability | null> {
    if (!isCapabilityName(name)) {
      return null;
    }
    log("Mounting capability: ", name);
    const capability = serverCapabilityRegistry[name];
    const mountedCap = await capability.mount({
      doCtx: this.ctx,
      messageJiggler: this.messageJiggler,
      stateRepository: this.stateRepository,
      config,
      broadcaster: this.broadcaster,
      nodeShareManager: this.nodeShareManager,
    });
    if (!mountedCap) {
      logError("Failed to mount", name);
    }
    return mountedCap ?? null;
  }

  async mountAll() {
    const config = this.getConfig();
    // `"always"` capabilities mount on every room regardless of config — no
    // opt-in/out. Skip any that are also named in the config so we don't mount
    // them twice (the config entry, with its own config, wins).
    const configNames = new Set<string>(
      config.capabilities.map(({ name }) => name),
    );
    const alwaysCapabilities = Object.values(serverCapabilityRegistry).filter(
      (cap) => cap.visibility === "always" && !configNames.has(cap.name),
    );
    await Promise.all([
      ...config.capabilities.map(async ({ name, config: capConfig }) => {
        const mountedCap = await this.mountCapability(name, capConfig);
        if (mountedCap) {
          this.capabilities.set(name, mountedCap);
        }
      }),
      ...alwaysCapabilities.map(async (cap) => {
        const mountedCap = await this.mountCapability(
          cap.name,
          cap.defaultConfig,
        );
        if (mountedCap) {
          this.capabilities.set(cap.name, mountedCap);
        }
      }),
    ]);
  }

  async onConfigChange(newConfig: RoomConfig) {
    // Unmount capabilities that were removed
    const oldConfig = this.getConfig();
    const newCapabilityNames = new Set(
      newConfig.capabilities.map(({ name }) => name),
    );
    for (const { name } of oldConfig.capabilities) {
      if (!newCapabilityNames.has(name)) {
        this.capabilities.delete(name);
        log(name, "unmounted");
      }
    }

    // Mount capabilities that were added, and announce them to all
    // currently connected clients
    const previousCapabilityNames = new Set(
      oldConfig.capabilities.map(({ name }) => name),
    );
    const addedCapabilities = newConfig.capabilities.filter(
      ({ name }) => !previousCapabilityNames.has(name),
    );
    await Promise.all(
      addedCapabilities.map(async ({ name, config: capConfig }) => {
        const mountedCap = await this.mountCapability(name, capConfig);
        if (mountedCap) {
          this.capabilities.set(name, mountedCap);
          this.broadcaster.broadcastCapabilityInit(mountedCap);
        }
      }),
    );
  }

  async handleAction(
    data: Extract<WebSocketClientMessage, { type: "action" }>["payload"],
    userId: string,
  ) {
    const cap = this.capabilities.get(data.capabilityName);
    if (!cap) {
      throw new Error(`Unknown capability: ${data.capabilityName}`);
    }
    await cap.onMessage({
      actionCall: data.actionCall,
      userId,
      displayName: data.displayName,
    });
  }
}
