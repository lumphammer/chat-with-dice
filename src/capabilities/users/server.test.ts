import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import { toAlphanumeric } from "#/utils/alphanumeric";
import type { WebSocketServerMessage } from "#/validators/webSocketMessageSchemas";
import { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityService } from "#/workers/ChatRoomDO/CapabilityService";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import type { OnlineUser } from "#/workers/ChatRoomDO/types";
import { usersServer } from "./server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shape the users capability persists. The runtime validator lives on
// `usersCommon`; we only need this to read state back in assertions.
type UsersState = {
  recentUsers: {
    userId: string;
    displayName: string;
    isAnonymous: boolean;
    image?: string;
    lastSeenTime: number;
    isOnline: boolean;
  }[];
};

const onlineUser = (
  userId: string,
  overrides: Partial<OnlineUser> = {},
): OnlineUser => ({
  userId,
  displayName: userId,
  isAnonymous: false,
  ...overrides,
});

/**
 * `applyStateChange` broadcasts on a `setTimeout(…, 0)`, so the broadcast lands
 * a macrotask after the hook resolves. Awaiting one timer flushes it.
 */
const flushBroadcast = () =>
  new Promise<void>((resolve) => setTimeout(resolve));

describe("users capability onPresenceChange hook", () => {
  let stateRepository: CapabilityStateRepository;
  let broadcaster: Broadcaster;
  let broadcastSpy: ReturnType<typeof vi.spyOn>;
  let service: CapabilityService;

  beforeEach(async () => {
    // In-memory KV behind a real `CapabilityStateRepository` (it has a nominal
    // private field, so a plain object won't structurally satisfy it). The cast
    // stands in for the Cloudflare `SyncKvStorage` runtime type, which isn't
    // available in the unit (Node) test environment.
    const store = new Map<string, unknown>();
    const kv = {
      get: (key: string) => store.get(key),
      put: (key: string, value: unknown) => void store.set(key, value),
    } as unknown as SyncKvStorage;
    stateRepository = new CapabilityStateRepository(kv);

    // A real `Broadcaster` so the capability's `broadcast(...)` call type-checks
    // and dispatches. `getWebSockets` returns no sockets, so the real body is a
    // harmless no-op even for stray `setTimeout` broadcasts that fire after the
    // spy is restored. The spy captures payloads for assertions.
    broadcaster = new Broadcaster({
      getWebSockets: () => [],
    } as unknown as DurableObjectState);
    broadcastSpy = vi.spyOn(broadcaster, "broadcast");

    const mounted = await usersServer.mount({
      doCtx: {} as unknown as DurableObjectState,
      messageJiggler: {} as unknown as MessageJiggler,
      stateRepository,
      config: undefined,
      nodeShareManager: {} as unknown as NodeShareManager,
      broadcaster,
    });
    if (!mounted) throw new Error("users capability failed to mount");

    const capabilities = new Map<string, ServerMountedCapability>([
      [mounted.name, mounted],
    ]);
    service = new CapabilityService(capabilities);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const readState = () => stateRepository.get("users") as UsersState;

  it("adds the current online users to recentUsers, carrying badge fields", async () => {
    await service.hooks.onPresenceChange({
      online: [
        onlineUser("alice", { image: "https://example.com/a.png" }),
        onlineUser("bob", { isAnonymous: true }),
      ],
    });

    const { recentUsers } = readState();
    expect(recentUsers.map((u) => u.userId)).toEqual(["alice", "bob"]);
    expect(recentUsers.every((u) => u.isOnline)).toBe(true);
    expect(recentUsers[0].image).toBe("https://example.com/a.png");
    expect(recentUsers[1].isAnonymous).toBe(true);
  });

  it("upserts on repeat: dedupes by userId and refreshes displayName + lastSeenTime", async () => {
    const firstSeen = 1000;
    const secondSeen = 2000;
    const nowSpy = vi.spyOn(Date, "now");

    nowSpy.mockReturnValue(firstSeen);
    await service.hooks.onPresenceChange({ online: [onlineUser("alice")] });

    nowSpy.mockReturnValue(secondSeen);
    await service.hooks.onPresenceChange({
      online: [onlineUser("alice", { displayName: "Alice Renamed" })],
    });

    const { recentUsers } = readState();
    expect(recentUsers).toHaveLength(1);
    expect(recentUsers[0]).toEqual({
      userId: "alice",
      displayName: "Alice Renamed",
      isAnonymous: false,
      lastSeenTime: secondSeen,
      isOnline: true,
    });
  });

  it("keeps users who have gone offline, flipping isOnline (recently seen ⊋ online now)", async () => {
    await service.hooks.onPresenceChange({
      online: [onlineUser("alice"), onlineUser("bob")],
    });
    await service.hooks.onPresenceChange({ online: [onlineUser("alice")] });

    const byId = Object.fromEntries(
      readState().recentUsers.map((u) => [u.userId, u]),
    );
    expect(Object.keys(byId).sort()).toEqual(["alice", "bob"]);
    expect(byId.alice.isOnline).toBe(true);
    expect(byId.bob.isOnline).toBe(false);
  });

  it("broadcasts capabilityState with no correlation (server-initiated)", async () => {
    await service.hooks.onPresenceChange({ online: [onlineUser("alice")] });
    await flushBroadcast();

    const message = broadcastSpy.mock.calls.at(
      -1,
    )?.[0] as WebSocketServerMessage;
    expect(message.type).toBe("capabilityState");
    if (message.type !== "capabilityState") throw new Error("unreachable");
    expect(message.payload.capability).toBe("users");
    expect(message.payload.correlation).toBeUndefined();
    expect((message.payload.state as UsersState).recentUsers).toHaveLength(1);
  });

  it("fans the event out to every mounted capability", async () => {
    const otherRunHook = vi.fn(async () => {});
    const other: ServerMountedCapability = {
      name: toAlphanumeric("other"),
      onMessage: async () => {},
      runHook: otherRunHook,
      getInitPayload: () => ({
        capability: "other",
        state: undefined,
        config: undefined,
      }),
    };
    const mounted = await usersServer.mount({
      doCtx: {} as unknown as DurableObjectState,
      messageJiggler: {} as unknown as MessageJiggler,
      stateRepository,
      config: undefined,
      nodeShareManager: {} as unknown as NodeShareManager,
      broadcaster,
    });
    if (!mounted) throw new Error("users capability failed to mount");
    const fanService = new CapabilityService(
      new Map<string, ServerMountedCapability>([
        [mounted.name, mounted],
        [other.name, other],
      ]),
    );

    const event = { online: [onlineUser("alice")] };
    await fanService.hooks.onPresenceChange(event);

    expect(otherRunHook).toHaveBeenCalledWith("onPresenceChange", event);
  });
});
