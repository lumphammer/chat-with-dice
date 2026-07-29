import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { createServerCapability } from "#/capabilities/createServerCapability";
import type {
  ServerCapability,
  ServerMountedCapability,
} from "#/capabilities/createServerCapability";
import type { HookDispatch } from "#/capabilities/hooks";
import { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

/**
 * A capability that exists to fire hooks from its action effects, and to
 * handle its own hook — which is a smell in real code, but it is precisely the
 * case the deferred flush protects, so it is what needs testing.
 *
 * It borrows `files:onShareRemoved` rather than declaring a hook of its own:
 * the prefix records which capability *owns* a hook, but nothing constrains
 * who may fire one, so a test capability can.
 */
const testCommon = createCapabilityCommon({
  name: "testcap",
  displayName: "Test capability",
  state: {
    validator: z.object({ log: z.array(z.string()) }),
    getInitialState: () => ({ log: [] }),
  },
  buildActions: ({ createAction }) => ({
    fireOnce: createAction({ payloadValidator: z.object({}) }),
    fireTwice: createAction({ payloadValidator: z.object({}) }),
    fireThenThrow: createAction({ payloadValidator: z.object({}) }),
    fireThenBailOut: createAction({ payloadValidator: z.object({}) }),
  }),
});

const event = (nodeId: string) => ({ ownerUserId: "owner", nodeId });

const testServer = createServerCapability(testCommon, {
  actionEffects: {
    fireOnce: ({ stateDraft, fireHook }) => {
      stateDraft.log.push("action");
      fireHook("files:onShareRemoved", event("first"));
    },
    fireTwice: ({ fireHook }) => {
      fireHook("files:onShareRemoved", event("first"));
      fireHook("files:onShareRemoved", event("second"));
    },
    fireThenThrow: ({ fireHook }) => {
      fireHook("files:onShareRemoved", event("first"));
      throw new Error("effect blew up");
    },
    fireThenBailOut: ({ fireHook }) => {
      // Mirrors the shape of `files`' own unshare effect: fire only once the
      // work has succeeded, so an early return leaves nothing queued.
      const failed = true;
      if (failed) return;
      fireHook("files:onShareRemoved", event("first"));
    },
  },
  hooks: {
    "files:onShareRemoved": ({ stateDraft, event: { nodeId } }) => {
      stateDraft.log.push(`hook:${nodeId}`);
    },
  },
});

type TestState = { log: string[] };

describe("createServerCapability hook firing", () => {
  let stateRepository: CapabilityStateRepository;
  let dispatchHook: ReturnType<typeof vi.fn>;
  let mounted: ServerMountedCapability;

  const mountCap = (capability: ServerCapability) =>
    capability.mount({
      doCtx: {} as unknown as DurableObjectState,
      messageJiggler: {} as unknown as MessageJiggler,
      stateRepository,
      config: undefined,
      nodeShareManager: {} as unknown as NodeShareManager,
      // `getWebSockets` returns nothing, so the real broadcast body is a
      // harmless no-op — including for the `setTimeout` broadcast that lands
      // after a test finishes.
      broadcaster: new Broadcaster({
        getWebSockets: () => [],
      } as unknown as DurableObjectState),
      getRoomOwnerUserId: async () => undefined,
      dispatchHook: dispatchHook as unknown as HookDispatch,
    });

  const callAction = (actionName: string) =>
    mounted.onMessage({
      actionCall: { actionName, correlation: "c1", params: {} },
      userId: "user",
      displayName: "User",
    });

  const readState = () => stateRepository.get("testcap") as TestState;

  beforeEach(async () => {
    // In-memory KV behind a real `CapabilityStateRepository` (it has a nominal
    // private field, so a plain object won't structurally satisfy it). The cast
    // stands in for the Cloudflare `SyncKvStorage` runtime type, which isn't
    // available in the unit (Node) test environment.
    const store = new Map<string, unknown>();
    stateRepository = new CapabilityStateRepository({
      get: (key: string) => store.get(key),
      put: (key: string, value: unknown) => void store.set(key, value),
    } as unknown as SyncKvStorage);

    // Records fired hooks without delivering them. Tests that need delivery
    // re-implement it to fan back into the mounted capability, the way
    // `CapabilityService.dispatch` does.
    dispatchHook = vi.fn(async () => {});

    const mountResult = await mountCap(testServer);
    if (!mountResult) throw new Error("test capability failed to mount");
    mounted = mountResult;
  });

  /** Deliver hooks back to the capability that fired them, as the real
   * dispatcher does — it fans out to every mounted capability, sender
   * included. */
  const deliverToSelf = () =>
    dispatchHook.mockImplementation(async (name, hookEvent) => {
      await mounted.runHook(name, hookEvent);
    });

  it("fires a hook queued by an action effect", async () => {
    await callAction("fireOnce");

    expect(dispatchHook).toHaveBeenCalledExactlyOnceWith(
      "files:onShareRemoved",
      event("first"),
    );
  });

  it("flushes multiple hooks in the order they were fired", async () => {
    await callAction("fireTwice");

    expect(dispatchHook.mock.calls).toEqual([
      ["files:onShareRemoved", event("first")],
      ["files:onShareRemoved", event("second")],
    ]);
  });

  it("does not fire a queued hook when the effect throws", async () => {
    await expect(callAction("fireThenThrow")).rejects.toThrow("effect blew up");

    expect(dispatchHook).not.toHaveBeenCalled();
  });

  it("does not fire when the effect bails out before firing", async () => {
    await callAction("fireThenBailOut");

    expect(dispatchHook).not.toHaveBeenCalled();
  });

  it("applies a handler's change on top of the firing action's, not over it", async () => {
    deliverToSelf();

    await callAction("fireOnce");

    // The whole point of deferring the flush. Dispatching while the action's
    // draft is open — or before the mount closure's `state` is reassigned —
    // would let the handler build its own draft from the pre-action state, and
    // its `finishDraft` would then clobber the action's "action" entry.
    expect(readState().log).toEqual(["action", "hook:first"]);
  });

  it("lets a handler fired twice accumulate both changes", async () => {
    deliverToSelf();

    await callAction("fireTwice");

    // Serial flushing: dispatching the two together would race the handler's
    // drafts over one state and lose the first.
    expect(readState().log).toEqual(["hook:first", "hook:second"]);
  });
});

/**
 * A capability whose stored state carries a field clients must never see.
 *
 * Its `projectState` is deliberately the identity function. That is the whole
 * point: `projectState` returns the same type it was handed, so an identity
 * projection type-checks, and a real one can lose its redaction to a careless
 * edit without anything complaining. `clientStateValidator` is what actually
 * keeps the field off the wire, and these tests fail if that stops being true.
 */
const redactingCommon = createCapabilityCommon({
  name: "redactingcap",
  displayName: "Redacting capability",
  state: {
    validator: z.object({
      items: z.array(
        z.object({ id: z.string(), secret: z.string().optional() }),
      ),
    }),
    getInitialState: () => ({ items: [] }),
  },
  buildActions: ({ createAction }) => ({
    add: createAction({
      payloadValidator: z.object({ id: z.string() }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.items.push({ id: payload.id, secret: "do not send" });
      },
    }),
  }),
});

const redactingServer = createServerCapability(redactingCommon, {
  clientStateValidator: z.object({
    items: z.array(z.object({ id: z.string() })),
  }),
  projectState: ({ state }) => state,
});

type RedactingState = { items: { id: string; secret?: string }[] };

/**
 * The broadcast lands on a `setTimeout(…, 0)`, so it is a macrotask behind the
 * action. Awaiting one timer flushes it.
 */
const flushBroadcast = () =>
  new Promise<void>((resolve) => setTimeout(resolve));

describe("createServerCapability client state stripping", () => {
  let stateRepository: CapabilityStateRepository;
  let broadcaster: Broadcaster;
  let perViewerSpy: ReturnType<typeof vi.spyOn>;
  let mounted: ServerMountedCapability;

  beforeEach(async () => {
    const store = new Map<string, unknown>();
    stateRepository = new CapabilityStateRepository({
      get: (key: string) => store.get(key),
      put: (key: string, value: unknown) => void store.set(key, value),
    } as unknown as SyncKvStorage);

    broadcaster = new Broadcaster({
      getWebSockets: () => [],
    } as unknown as DurableObjectState);
    perViewerSpy = vi.spyOn(broadcaster, "broadcastCapabilityStatePerViewer");

    const mountResult = await redactingServer.mount({
      doCtx: {} as unknown as DurableObjectState,
      messageJiggler: {} as unknown as MessageJiggler,
      stateRepository,
      config: undefined,
      nodeShareManager: {} as unknown as NodeShareManager,
      broadcaster,
      getRoomOwnerUserId: async () => undefined,
      dispatchHook: async () => {},
    });
    if (!mountResult) throw new Error("redacting capability failed to mount");
    mounted = mountResult;
  });

  const add = (id: string) =>
    mounted.onMessage({
      actionCall: { actionName: "add", correlation: "c1", params: { id } },
      userId: "author",
      displayName: "Author",
    });

  it("keeps the undeclared field in stored state", async () => {
    await add("one");

    const stored = stateRepository.get("redactingcap") as RedactingState;
    expect(stored.items[0].secret).toBe("do not send");
  });

  it("strips it from the broadcast even though the projection does not", async () => {
    await add("one");
    await flushBroadcast();

    const call = perViewerSpy.mock.calls.at(-1)?.[0] as {
      project: (viewerUserId: string) => RedactingState;
    };
    const sent = call.project("author");

    expect(sent.items).toEqual([{ id: "one" }]);
    expect(sent.items[0]).not.toHaveProperty("secret");
  });

  it("strips it from the init payload too", async () => {
    await add("one");

    const sent = mounted.getInitPayload("author").state as RedactingState;

    expect(sent.items).toEqual([{ id: "one" }]);
    expect(sent.items[0]).not.toHaveProperty("secret");
  });
});
