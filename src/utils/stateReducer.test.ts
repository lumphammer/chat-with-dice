// oxlint-disable no-magic-numbers
import { createStateReducer } from "./stateReducer";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const counterSchema = z.object({ count: z.number() });

const counterReducer = createStateReducer(counterSchema, (create) => ({
  increment: create(z.object({ by: z.number() }), (draft, { by }) => {
    draft.count += by;
  }),
  setCount: create(z.object({ value: z.number() }), (draft, { value }) => {
    draft.count = value;
  }),
  reset: create(z.undefined(), (draft) => {
    draft.count = 0;
  }),
}));

// ---------------------------------------------------------------------------

describe("createStateReducer", () => {
  describe("returned stateValidator", () => {
    it("is the same reference as the validator passed in", () => {
      expect(counterReducer.stateValidator).toBe(counterSchema);
    });

    it("accepts valid state", () => {
      expect(counterSchema.safeParse({ count: 42 }).success).toBe(true);
    });

    it("rejects invalid state", () => {
      expect(counterSchema.safeParse({ count: "nope" }).success).toBe(false);
    });
  });

  describe("returned actions", () => {
    it("has a key for every case", () => {
      expect(counterReducer.actions).toHaveProperty("increment");
      expect(counterReducer.actions).toHaveProperty("setCount");
      expect(counterReducer.actions).toHaveProperty("reset");
    });

    it("uses the case key as the action type", () => {
      const action = counterReducer.actions.increment({ by: 1 });
      expect(action.type).toBe("increment");
    });

    it("includes the payload in the action", () => {
      const action = counterReducer.actions.increment({ by: 5 });
      expect(action.payload).toEqual({ by: 5 });
    });

    it("produces the correct action for each creator", () => {
      expect(counterReducer.actions.setCount({ value: 99 })).toEqual({
        type: "setCount",
        payload: { value: 99 },
      });
    });

    it("includes an undefined payload for a z.undefined() case", () => {
      expect(counterReducer.actions.reset()).toEqual({
        type: "reset",
        payload: undefined,
      });
    });
  });

  describe("returned reducer", () => {
    describe("unknown actions", () => {
      it("returns the exact same state reference for an unknown action type", () => {
        const state = { count: 7 };
        const result = counterReducer.reducer(state, { type: "unknown" });
        expect(result).toBe(state);
      });
    });

    describe("known actions", () => {
      it("applies the correct mutation", () => {
        const state = { count: 10 };
        const result = counterReducer.reducer(
          state,
          counterReducer.actions.increment({ by: 3 }),
        );
        expect(result).toEqual({ count: 13 });
      });

      it("does not mutate the original state", () => {
        const state = Object.freeze({ count: 10 });
        const result = counterReducer.reducer(
          state,
          counterReducer.actions.increment({ by: 1 }),
        );
        // Original is untouched
        expect(state.count).toBe(10);
        // New state has the update
        expect(result.count).toBe(11);
      });

      it("handles a z.undefined() case with no payload", () => {
        const state = { count: 42 };
        const result = counterReducer.reducer(
          state,
          counterReducer.actions.reset(),
        );
        expect(result).toEqual({ count: 0 });
      });

      it("applies multiple distinct cases independently", () => {
        const state = { count: 5 };

        const after = counterReducer.reducer(
          state,
          counterReducer.actions.increment({ by: 10 }),
        );
        expect(after).toEqual({ count: 15 });

        const reset = counterReducer.reducer(
          after,
          counterReducer.actions.reset(),
        );
        expect(reset).toEqual({ count: 0 });
      });

      it("can be chained across multiple dispatches", () => {
        let state = { count: 0 };
        state = counterReducer.reducer(
          state,
          counterReducer.actions.increment({ by: 1 }),
        );
        state = counterReducer.reducer(
          state,
          counterReducer.actions.increment({ by: 2 }),
        );
        state = counterReducer.reducer(
          state,
          counterReducer.actions.setCount({ value: 100 }),
        );
        state = counterReducer.reducer(
          state,
          counterReducer.actions.increment({ by: -1 }),
        );
        expect(state).toEqual({ count: 99 });
      });
    });

    describe("payload validation", () => {
      it("throws a descriptive error when the payload fails Zod validation", () => {
        const state = { count: 0 };
        expect(() =>
          counterReducer.reducer(state, {
            type: "increment",
            payload: { by: "not-a-number" },
          }),
        ).toThrow(/Invalid payload for action "increment"/);
      });

      it("throws when a required payload is missing entirely", () => {
        const state = { count: 0 };
        expect(() =>
          counterReducer.reducer(state, { type: "increment" }),
        ).toThrow(/Invalid payload for action "increment"/);
      });

      it("throws when an unexpected payload shape is given", () => {
        const state = { count: 0 };
        expect(() =>
          counterReducer.reducer(state, {
            type: "setCount",
            payload: { totally: "wrong" },
          }),
        ).toThrow(/Invalid payload for action "setCount"/);
      });
    });
  });
});
