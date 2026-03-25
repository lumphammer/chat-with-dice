// oxlint-disable no-magic-numbers
import { createCapability } from "./capabilities";
import { counterCapability } from "./counterCapability";
import type { DBHandle } from "./types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  const ctx = {
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

  return { ctx, store };
}

const mockDb = null as unknown as DBHandle;

// ---------------------------------------------------------------------------
// createCapability framework tests
//
// These use a minimal test-local capability so they stay independent of
// counterCapability's initialisation and storage logic.
// ---------------------------------------------------------------------------

describe("createCapability", () => {
  const { ctx: mockCtx } = makeDoCtx();

  const testCapability = createCapability({
    name: "TestCap",
    initialise: async () => ({ value: 0 }),
    configValidator: z.null(),
    buildActions: (createAction) => ({
      setValue: createAction(
        z.object({ to: z.number() }),
        async (_doCtx, capCtx, payload) => {
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

  describe("onMessage", () => {
    it("dispatches to the correct action and mutates capCtx", async () => {
      const capCtx = { value: 0 };
      await testCapability.onMessage(mockCtx, capCtx, {
        action: "setValue",
        payload: { to: 99 },
      });
      expect(capCtx.value).toBe(99);
    });

    it("throws on an unknown action name", async () => {
      await expect(
        testCapability.onMessage(
          mockCtx,
          { value: 0 },
          {
            action: "nonexistent",
            payload: {},
          },
        ),
      ).rejects.toThrow("Unknown action: nonexistent");
    });

    it("re-validates the payload server-side and throws on invalid input", async () => {
      await expect(
        testCapability.onMessage(
          mockCtx,
          { value: 0 },
          {
            action: "setValue",
            payload: { to: "not-a-number" },
          },
        ),
      ).rejects.toThrow();
    });
  });

  describe("mount", () => {
    it("returns a MountedCapability with the capability's name", async () => {
      const mounted = await testCapability.mount(mockCtx, mockDb, null);
      expect(mounted.name).toBe("TestCap");
    });

    it("closes over the initialised capCtx, accumulating state across calls", async () => {
      const { ctx, store } = makeDoCtx();

      // This capability writes its running total to storage so we can observe
      // whether the same capCtx reference is reused between calls.
      const accumulator = createCapability({
        name: "Accumulator",
        initialise: async () => ({ total: 0 }),
        configValidator: z.object({ initial: z.int() }),
        buildActions: (createAction) => ({
          add: createAction(
            z.object({ amount: z.number() }),
            async (doCtx, capCtx, { amount }) => {
              capCtx.total += amount;
              await doCtx.storage.put("total", capCtx.total);
            },
          ),
        }),
      });

      const mounted = await accumulator.mount(ctx, mockDb, { initial: 0 });
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
  describe("initialise", () => {
    it("returns { count: 0 } when storage is empty", async () => {
      const { ctx } = makeDoCtx();
      expect(
        await counterCapability.initialise({
          ctx,
          db: mockDb,
          config: { startAt: 3 },
        }),
      ).toEqual({
        count: 3,
      });
    });

    it("persists the default state to kv when storage is empty", async () => {
      const { ctx, store } = makeDoCtx();
      await counterCapability.initialise({
        ctx,
        db: mockDb,
        config: { startAt: 3 },
      });
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 3,
      });
    });

    it("loads a previously persisted state from kv", async () => {
      const { ctx } = makeDoCtx({
        counter_capability: JSON.stringify({ count: 42 }),
      });
      expect(
        await counterCapability.initialise({
          ctx,
          db: mockDb,
          config: { startAt: 10 },
        }),
      ).toEqual({
        count: 42,
      });
    });

    describe("corrupt stored state", () => {
      beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => {});
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it("defaults to config when stored state fails schema validation", async () => {
        const { ctx } = makeDoCtx({
          counter_capability: JSON.stringify({ count: "not-a-number" }),
        });
        expect(
          await counterCapability.initialise({
            ctx,
            db: mockDb,
            config: { startAt: 10 },
          }),
        ).toEqual({
          count: 10,
        });
      });

      it("defaults to { count: 0 } when stored state is invalid JSON", async () => {
        const { ctx } = makeDoCtx({
          counter_capability: "this is {{{ not valid json",
        });
        expect(
          await counterCapability.initialise({
            ctx,
            db: mockDb,
            config: { startAt: 10 },
          }),
        ).toEqual({
          count: 10,
        });
      });
    });
  });

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

  describe("increment action", () => {
    it("increases capCtx.count by the given amount", async () => {
      const { ctx } = makeDoCtx();
      const capCtx = { count: 10 };
      await counterCapability.onMessage(ctx, capCtx, {
        action: "increment",
        payload: { by: 5 },
      });
      expect(capCtx.count).toBe(15);
    });

    it("accepts negative amounts (decrement)", async () => {
      const { ctx } = makeDoCtx();
      const capCtx = { count: 10 };
      await counterCapability.onMessage(ctx, capCtx, {
        action: "increment",
        payload: { by: -3 },
      });
      expect(capCtx.count).toBe(7);
    });

    it("persists the updated state via storage.put", async () => {
      const { ctx, store } = makeDoCtx();
      await counterCapability.onMessage(
        ctx,
        { count: 10 },
        {
          action: "increment",
          payload: { by: 3 },
        },
      );
      expect(JSON.parse(store["counter_capability"] as string)).toEqual({
        count: 13,
      });
    });

    it("accumulates correctly across multiple mounted calls", async () => {
      const { ctx, store } = makeDoCtx({
        counter_capability: JSON.stringify({ count: 0 }),
      });
      const mounted = await counterCapability.mount(ctx, mockDb, {
        startAt: 3,
      });

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
