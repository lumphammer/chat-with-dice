// oxlint-disable no-shadow
// oxlint-disable no-magic-numbers
import type { RollerMessage } from "#/validators/rollerMessageType";
import type { MessageRepository } from "../workers/DiceRollerRoom/MessageRepository";
import { createCapability } from "./capabilities";
import { counterCapability } from "./counterCapability";
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
function makeDoCtx(initialKv: Record<string, string> = {}) {
  const store: Record<string, unknown> = { ...initialKv };

  const doCtxMock = {
    storage: {
      kv: {
        get: (key: string): unknown => store[key],
        put: (key: string, value: unknown): void => {
          store[key] = value;
        },
      },
      put: (key: string, value: unknown): Promise<void> => {
        store[key] = value;
        return Promise.resolve();
      },
    },
  } as unknown as DurableObjectState;

  return { doCtxMock, store };
}

const mockMessageRepository = {
  async insert(_message: RollerMessage): Promise<void> {
    //
  },

  async getRecent(_limit?: number): Promise<RollerMessage[]> {
    return [];
  },
} as unknown as MessageRepository;

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
    initialise: async () => ({ value: 0 }),
    configValidator: z.null(),
    buildActions: (createAction) => ({
      setValue: createAction(
        z.object({ to: z.number() }),
        async ({ capCtx, payload }) => {
          capCtx.value = payload.to;
        },
      ),
    }),
  });

  describe("creators", () => {
    it("produces a correctly shaped ActionCallMessage for a valid payload", () => {
      expect(testCapability.creators.setValue({ to: 42 })).toEqual({
        type: "action",
        payload: {
          capability: "TestCap",
          payload: { action: "setValue", payload: { to: 42 } },
        },
      });
    });

    it("throws when the payload fails client-side validation", () => {
      expect(() =>
        testCapability.creators.setValue({ to: "not-a-number" } as unknown as {
          to: number;
        }),
      ).toThrow();
    });
  });

  describe("mount", () => {
    it("returns a MountedCapability with the capability's name", async () => {
      const mounted = await testCapability.mount(
        doCtxMock,
        mockMessageRepository,
        null,
      );
      assert(mounted);
      expect(mounted.name).toBe("TestCap");
    });

    it("returns null when config fails validation", async () => {
      // configValidator is z.null(), so anything other than null should fail
      const mounted = await testCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { unexpected: "value" },
      );
      expect(mounted).toBeNull();
    });

    it("closes over the initialised capCtx, accumulating state across calls", async () => {
      const { doCtxMock, store } = makeDoCtx();

      // This capability writes its running total to storage so we can observe
      // whether the same capCtx reference is reused between calls.
      const accumulator = createCapability({
        name: "Accumulator",
        initialise: async () => ({ total: 0 }),
        configValidator: z.object({ initial: z.int() }),
        buildActions: (createAction) => ({
          add: createAction(
            z.object({ amount: z.number() }),
            async ({ doCtx, capCtx, payload: { amount } }) => {
              capCtx.total += amount;
              await doCtx.storage.put("total", capCtx.total);
            },
          ),
        }),
      });

      const mounted = await accumulator.mount(
        doCtxMock,
        mockMessageRepository,
        { initial: 0 },
      );
      assert(mounted);
      await mounted.onMessage({ action: "add", payload: { amount: 3 } });
      await mounted.onMessage({ action: "add", payload: { amount: 4 } });

      // If the same capCtx is reused: 0 + 3 + 4 = 7
      // If it were re-initialised each call it would be 4
      expect(store["total"]).toBe(7);
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
      const { doCtxMock, store } = makeDoCtx();
      const mounted = await counterCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { startAt: 3 },
      );
      assert(mounted);
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 3,
      });
    });

    it("loads a previously persisted count from kv, ignoring startAt", async () => {
      const { doCtxMock, store } = makeDoCtx({
        counter_capability: JSON.stringify({ count: 42 }),
      });
      const mounted = await counterCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { startAt: 10 },
      );
      assert(mounted);

      // Increment by 1 to make the loaded count observable via storage.
      // If count was loaded as 42, the result will be 43.
      // If startAt: 10 was incorrectly used instead, the result would be 11.
      await mounted.onMessage({ action: "increment", payload: { by: 1 } });
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 43,
      });
    });

    it("returns null when config is invalid", async () => {
      const { doCtxMock } = makeDoCtx();
      const mounted = await counterCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { invalidField: true },
      );
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
        const { doCtxMock, store } = makeDoCtx({
          counter_capability: JSON.stringify({ count: "not-a-number" }),
        });
        const mounted = await counterCapability.mount(
          doCtxMock,
          mockMessageRepository,
          { startAt: 10 },
        );
        assert(mounted);

        // Increment by 0 as a probe: forces the current capCtx.count to be
        // written to storage without changing its value.
        await mounted.onMessage({ action: "increment", payload: { by: 0 } });
        expect(JSON.parse(store["counter_capability"] as string)).toEqual({
          count: 10,
        });
      });

      it("falls back to startAt when stored state is invalid JSON", async () => {
        const { doCtxMock, store } = makeDoCtx({
          counter_capability: "this is {{{ not valid json",
        });
        const mounted = await counterCapability.mount(
          doCtxMock,
          mockMessageRepository,
          { startAt: 10 },
        );
        assert(mounted);

        await mounted.onMessage({ action: "increment", payload: { by: 0 } });
        expect(JSON.parse(store["counter_capability"] as string)).toEqual({
          count: 10,
        });
      });
    });
  });

  // -------------------------------------------------------------------------
  // creators
  // -------------------------------------------------------------------------

  describe("creators.increment", () => {
    it("produces an ActionCallMessage targeting the Counter capability", () => {
      expect(counterCapability.creators.increment({ by: 5 })).toEqual({
        type: "action",
        payload: {
          capability: "Counter",
          payload: { action: "increment", payload: { by: 5 } },
        },
      });
    });

    it("throws when the payload is not a number", () => {
      expect(() =>
        counterCapability.creators.increment({ by: "bad" } as unknown as {
          by: number;
        }),
      ).toThrow();
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
      const { doCtxMock, store } = makeDoCtx({
        counter_capability: JSON.stringify({ count: 10 }),
      });
      const mounted = await counterCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { startAt: 0 },
      );
      assert(mounted);
      await mounted.onMessage({ action: "increment", payload: { by: 5 } });
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 15,
      });
    });

    it("accepts negative amounts (decrement)", async () => {
      const { doCtxMock, store } = makeDoCtx({
        counter_capability: JSON.stringify({ count: 10 }),
      });
      const mounted = await counterCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { startAt: 0 },
      );
      assert(mounted);
      await mounted.onMessage({ action: "increment", payload: { by: -3 } });
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 7,
      });
    });

    it("persists the updated count to kv via storage.put", async () => {
      const { doCtxMock, store } = makeDoCtx({
        counter_capability: JSON.stringify({ count: 10 }),
      });
      const mounted = await counterCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { startAt: 0 },
      );
      assert(mounted);
      await mounted.onMessage({ action: "increment", payload: { by: 3 } });
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 13,
      });
    });

    it("accumulates correctly across multiple mounted calls", async () => {
      const { doCtxMock, store } = makeDoCtx({
        counter_capability: JSON.stringify({ count: 0 }),
      });
      const mounted = await counterCapability.mount(
        doCtxMock,
        mockMessageRepository,
        { startAt: 3 },
      );
      assert(mounted);
      await mounted.onMessage({ action: "increment", payload: { by: 10 } });
      await mounted.onMessage({ action: "increment", payload: { by: 5 } });
      await mounted.onMessage({ action: "increment", payload: { by: -2 } });

      // 0 + 10 + 5 - 2 = 13
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 13,
      });
    });
  });
});
