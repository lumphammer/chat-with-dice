import { createCapability } from "./capabilities";
import { z } from "zod/v4";

const counterCapabilityStateValidator = z.object({ count: z.int() });

export const counterCapability = createCapability({
  name: "Counter",
  configValidator: z.object({ startAt: z.int() }),
  initialise: async ({ ctx, config }) => {
    const storedState = ctx.storage.kv.get("counter_capability");
    let state: z.infer<typeof counterCapabilityStateValidator>;
    if (storedState === undefined || typeof storedState !== "string") {
      state = { count: config.startAt };
      ctx.storage.kv.put("counter_capability", JSON.stringify(state));
    } else
      try {
        state = counterCapabilityStateValidator.parse(JSON.parse(storedState));
      } catch (e: unknown) {
        console.error(
          "failed to validate stored state for counter capability, defaulting",
          e instanceof Error ? e.message : String(e),
        );
        state = { count: config.startAt };
      }

    return state;
  },
  buildActions: (createAction) => ({
    increment: createAction(
      z.object({ by: z.number() }),
      async (doCtx, capCtx, payload) => {
        capCtx.count += payload.by;
        doCtx.storage.put("counter_capability", JSON.stringify(capCtx));
      },
    ),
  }),
});
