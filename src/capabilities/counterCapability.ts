import { createCapability } from "./createCapability";
import { z } from "zod/v4";

const counterCapabilityStateValidator = z.object({ count: z.int() });

export const counterCapability = createCapability({
  name: "counter",
  configValidator: z.object({ startAt: z.int() }),
  defaultConfig: { startAt: 0 },
  stateValidator: counterCapabilityStateValidator,
  getInitialState: ({ config }) => ({ count: config.startAt }),
  initialise: async () => {},
  buildActions: ({ createSimpleAction }) => ({
    increment: createSimpleAction({
      payloadValidator: z.object({ by: z.number() }),
      actionFn: async ({ stateDraft, payload }) => {
        stateDraft.count += payload.by;
      },
    }),
  }),
});
