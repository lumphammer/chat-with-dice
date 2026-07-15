import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import { filesServer } from "#/capabilities/files/server";
import type { StorageNode } from "#/validators/storageNodeValidator";
import { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `NodeShareManager` reaches `cloudflare:workers` via `#/db`, which only
// resolves in the workers test pool. This is a unit test and never touches the
// db, so a bare stub lets the module graph load.
vi.mock("cloudflare:workers", () => ({ env: {} }));

const OWNER = "owner-user";

const node = (id: string): StorageNode => ({
  version: 1,
  kind: "folder",
  id,
  name: id,
  parentFolderId: null,
  createdTime: 1,
  deletedTime: null,
  sizeBytes: 0,
});

const share = (nodeId: string, unavailable = false) => ({
  userId: OWNER,
  userDisplayName: "Owner",
  dateShared: 1,
  node: node(nodeId),
  unavailable,
});

type FilesState = { shares: ReturnType<typeof share>[] };

describe("files onShareAvailabilityChange hook", () => {
  let stateRepository: CapabilityStateRepository;
  let mounted: ServerMountedCapability;

  const readShares = () =>
    (stateRepository.get("files") as FilesState).shares.map((s) => ({
      id: s.node.id,
      unavailable: s.unavailable,
    }));

  const mountWith = async (shares: ReturnType<typeof share>[]) => {
    stateRepository.set("files", { version: 5, shares });
    const result = await filesServer.mount({
      doCtx: {} as unknown as DurableObjectState,
      messageJiggler: {} as unknown as MessageJiggler,
      stateRepository,
      config: undefined,
      nodeShareManager: {} as unknown as NodeShareManager,
      broadcaster: new Broadcaster({
        getWebSockets: () => [],
      } as unknown as DurableObjectState),
      dispatchHook: async () => {},
    });
    if (!result) throw new Error("files capability failed to mount");
    mounted = result;
  };

  beforeEach(() => {
    const store = new Map<string, unknown>();
    stateRepository = new CapabilityStateRepository({
      get: (key: string) => store.get(key),
      put: (key: string, value: unknown) => void store.set(key, value),
    } as unknown as SyncKvStorage);
  });

  it("hides a share the owner has binned", async () => {
    await mountWith([share("magus"), share("wandering-monsters")]);

    await mounted.runHook("onShareAvailabilityChange", {
      changes: [{ ownerUserId: OWNER, nodeId: "magus", unavailable: true }],
    });

    expect(readShares()).toEqual([
      { id: "magus", unavailable: true },
      { id: "wandering-monsters", unavailable: false },
    ]);
  });

  it("brings a share back when the owner restores it", async () => {
    await mountWith([share("magus", true)]);

    await mounted.runHook("onShareAvailabilityChange", {
      changes: [{ ownerUserId: OWNER, nodeId: "magus", unavailable: false }],
    });

    expect(readShares()).toEqual([{ id: "magus", unavailable: false }]);
  });

  it("keeps the share rather than dropping it, so a restore has something to restore", async () => {
    await mountWith([share("magus")]);

    await mounted.runHook("onShareAvailabilityChange", {
      changes: [{ ownerUserId: OWNER, nodeId: "magus", unavailable: true }],
    });

    // The grant survives a soft delete, so the room's cache must too — the
    // owner's display name is not recoverable from the owner's file store.
    expect(readShares()).toHaveLength(1);
  });

  it("ignores a change for a node this room never cached", async () => {
    await mountWith([share("magus")]);

    await mounted.runHook("onShareAvailabilityChange", {
      changes: [{ ownerUserId: OWNER, nodeId: "not-here", unavailable: true }],
    });

    expect(readShares()).toEqual([{ id: "magus", unavailable: false }]);
  });

  it("does not touch an identically-named node owned by someone else", async () => {
    await mountWith([share("magus")]);

    await mounted.runHook("onShareAvailabilityChange", {
      changes: [
        { ownerUserId: "somebody-else", nodeId: "magus", unavailable: true },
      ],
    });

    expect(readShares()).toEqual([{ id: "magus", unavailable: false }]);
  });
});
