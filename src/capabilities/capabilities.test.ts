// oxlint-disable no-shadow
// oxlint-disable no-magic-numbers
import type { RollerMessage } from "#/validators/webSocketMessageSchemas";
import type { CapabilityStateRepository } from "#/workers/DiceRollerRoom/CapabilityStateRepository";
import { Broadcaster } from "../workers/DiceRollerRoom/Broadcaster";
import type { MessageRepository } from "../workers/DiceRollerRoom/MessageRepository";
import { counterCapability } from "./counterCapability";
import { createCapability } from "./createCapability";
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal mock of DurableObjectState with just the storage surface
 * used by this capability system. Returns the ctx to pass to capabilities,
 * plus direct handles on the underlying stores for making assertions.
 *
 * Both `storage.kv.put` and `storage.put` write to the same `store` map,
 * mirroring how the real implementation uses a single SQLite backing store.
 */
function makeDoCtx() {
  // const store: Record<string, unknown> = { ...initialKv };

  const doCtxMock = {
    storage: {
      kv: {
        get: () => {
          throw new Error("doCtx used in test");
        },
        put: () => {
          throw new Error("doCtx used in test");
        },
      },
    },
  } as unknown as DurableObjectState;

  return { doCtxMock };
}

const mockMessageRepository = {
  async insert(_message: RollerMessage): Promise<void> {
    //
  },

  async getRecent(_limit?: number): Promise<RollerMessage[]> {
    return [];
  },
} as unknown as MessageRepository;

function makeMockBroadcaster(): Broadcaster {
  return {
    broadcast: () => {},
  } as unknown as Broadcaster;
}

function makeMockStateRepository(initialState: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initialState };
  return {
    store,
    stateRepository: {
      get: (key: string): unknown => {
        return store[key];
      },
      set: (key: string, value: unknown): void => {
        store[key] = value;
      },
    } as unknown as CapabilityStateRepository,
  };
}

// ---------------------------------------------------------------------------
// createCapability framework tests
//
// These use a minimal test-local capability so they stay independent of
// counterCapability's initialisation and storage logic.
// ---------------------------------------------------------------------------

describe("createCapability", () => {
  const { doCtxMock } = makeDoCtx();

  const testCapability = createCapability({
    name: "TestCap",
    initialise: async () => {},
    configValidator: z.null(),
    defaultConfig: null,
    stateValidator: z.object({ value: z.int() }),
    getInitialState: () => ({ value: 0 }),
    buildActions: ({ createAction }) => ({
      setValue: createAction({
        payloadValidator: z.object({ to: z.number() }),
        pureFn: async ({ stateDraft, payload }) => {
          stateDraft.value = payload.to;
        },
      }),
    }),
  });

  describe("mount", () => {
    it("returns a MountedCapability with the capability's name", async () => {
      const broadcaster = makeMockBroadcaster();
      const { stateRepository } = makeMockStateRepository();
      const mounted = await testCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        broadcaster,
        stateRepository,
        config: null,
      });
      assert(mounted);
      expect(mounted.name).toBe("TestCap");
    });

    it("returns null when config fails validation", async () => {
      // configValidator is z.null(), so anything other than null should fail
      const broadcaster = makeMockBroadcaster();
      const { stateRepository } = makeMockStateRepository();
      const mounted = await testCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        broadcaster,
        stateRepository,
        config: { unexpected: "value" },
      });
      expect(mounted).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// counterCapability tests
// ---------------------------------------------------------------------------

describe("counterCapability", () => {
  // -------------------------------------------------------------------------
  // Initialise behaviour — tested via mount since initialise is internal
  // -------------------------------------------------------------------------

  describe("mount (initialise behaviour)", () => {
    it("uses startAt from config when storage is empty, and persists it to kv", async () => {
      const { doCtxMock } = makeDoCtx();
      const broadcaster = makeMockBroadcaster();
      const { stateRepository, store } = makeMockStateRepository();

      const mounted = await counterCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        broadcaster,
        stateRepository,
        config: { startAt: 3 },
      });
      assert(mounted);
      expect(store).toMatchInlineSnapshot(`
        {
          "counter": {
            "count": 3,
          },
        }
      `);
    });

    it("loads a previously persisted count from kv, ignoring startAt", async () => {
      const { doCtxMock } = makeDoCtx();
      const broadcaster = makeMockBroadcaster();
      const { stateRepository, store } = makeMockStateRepository({
        counter: { count: 10 },
      });

      const mounted = await counterCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        stateRepository,
        broadcaster,
        config: { startAt: 0 },
      });
      assert(mounted);

      // Increment by 1 to make the loaded count observable via storage.
      // If startAt: 0 was incorrectly used instead, the result would be 1.
      await mounted.onMessage({
        actionCall: {
          actionName: "increment",
          correlation: "",
          params: { by: 1 },
        },
        chatId: "",
        displayName: "",
      });
      expect(store).toMatchInlineSnapshot(`
        {
          "counter": {
            "count": 11,
          },
        }
      `);
    });

    it("returns null when config is invalid", async () => {
      const { doCtxMock } = makeDoCtx();
      const broadcaster = makeMockBroadcaster();
      const { stateRepository } = makeMockStateRepository();

      const mounted = await counterCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        stateRepository,
        broadcaster,
        config: { invalidField: true },
      });
      expect(mounted).toBeNull();
    });

    describe("corrupt stored state", () => {
      beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => {});
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it("falls back to startAt when stored state fails schema validation", async () => {
        const { doCtxMock } = makeDoCtx();
        const broadcaster = makeMockBroadcaster();
        const { stateRepository, store } = makeMockStateRepository({
          counter: {
            count: "not-a-number",
          },
        });

        const mounted = await counterCapability.mount({
          doCtx: doCtxMock,
          messageRepository: mockMessageRepository,
          stateRepository,
          broadcaster,
          config: { startAt: 10 },
        });
        assert(mounted);

        // Increment by 0 as a probe: forces the current capCtx.count to be
        // written to storage without changing its value.
        await mounted.onMessage({
          actionCall: {
            actionName: "increment",
            correlation: "",
            params: { by: 0 },
          },
          chatId: "",
          displayName: "",
        });
        expect(store).toMatchInlineSnapshot(`
          {
            "counter": {
              "count": 10,
            },
          }
        `);
      });

      it("falls back to startAt when stored state is invalid JSON", async () => {
        const { doCtxMock } = makeDoCtx();
        const broadcaster = makeMockBroadcaster();
        const { stateRepository, store } = makeMockStateRepository({
          counter: "this is {{{ not valid json",
        });

        const mounted = await counterCapability.mount({
          doCtx: doCtxMock,
          messageRepository: mockMessageRepository,
          stateRepository,
          broadcaster,
          config: { startAt: 10 },
        });
        assert(mounted);

        await mounted.onMessage({
          actionCall: {
            actionName: "increment",
            correlation: "",
            params: { by: 0 },
          },
          chatId: "",
          displayName: "",
        });
        expect(store).toMatchInlineSnapshot(`
          {
            "counter": {
              "count": 10,
            },
          }
        `);
      });
    });
  });

  // -------------------------------------------------------------------------
  // increment action
  //
  // These tests mount with a known initial count pre-loaded in kv so that
  // each test exercises the action in isolation.
  // -------------------------------------------------------------------------

  describe("increment action", () => {
    it("increases count by the given amount", async () => {
      const { doCtxMock } = makeDoCtx();
      const broadcaster = makeMockBroadcaster();
      const { stateRepository, store } = makeMockStateRepository({
        counter: { count: 10 },
      });

      const mounted = await counterCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        stateRepository,
        broadcaster,
        config: { startAt: 0 },
      });
      assert(mounted);
      await mounted.onMessage({
        actionCall: {
          actionName: "increment",
          correlation: "",
          params: { by: 5 },
        },
        chatId: "",
        displayName: "",
      });
      expect(store).toMatchInlineSnapshot(`
        {
          "counter": {
            "count": 15,
          },
        }
      `);
    });

    it("accepts negative amounts (decrement)", async () => {
      const { doCtxMock } = makeDoCtx();
      const { stateRepository, store } = makeMockStateRepository({
        counter: { count: 10 },
      });
      const broadcaster = makeMockBroadcaster();
      const mounted = await counterCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        stateRepository,
        broadcaster,
        config: { startAt: 0 },
      });
      assert(mounted);
      await mounted.onMessage({
        actionCall: {
          actionName: "increment",
          correlation: "",
          params: { by: -3 },
        },
        chatId: "",
        displayName: "",
      });
      expect(store).toMatchInlineSnapshot(`
        {
          "counter": {
            "count": 7,
          },
        }
      `);
    });

    it("accumulates correctly across multiple mounted calls", async () => {
      const { doCtxMock } = makeDoCtx();

      const broadcaster = makeMockBroadcaster();
      const { stateRepository, store } = makeMockStateRepository({
        counter: { count: 0 },
      });

      const mounted = await counterCapability.mount({
        doCtx: doCtxMock,
        messageRepository: mockMessageRepository,
        stateRepository,
        broadcaster,
        config: { startAt: 3 },
      });
      assert(mounted);
      await mounted.onMessage({
        actionCall: {
          actionName: "increment",
          correlation: "",
          params: { by: 10 },
        },
        chatId: "",
        displayName: "",
      });
      await mounted.onMessage({
        actionCall: {
          actionName: "increment",
          correlation: "",
          params: { by: 5 },
        },
        chatId: "",
        displayName: "",
      });
      await mounted.onMessage({
        actionCall: {
          actionName: "increment",
          correlation: "",
          params: { by: -2 },
        },
        chatId: "",
        displayName: "",
      });

      // 0 + 10 + 5 - 2 = 13
      expect(store).toMatchInlineSnapshot(`
        {
          "counter": {
            "count": 13,
          },
        }
      `);
    });
  });
});
