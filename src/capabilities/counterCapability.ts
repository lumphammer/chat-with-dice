import { createCapability } from "./createCapability";
import { z } from "zod/v4";

export const counterCapability = createCapability({
  name: "counter",
  configValidator: z.object({ startAt: z.int() }),
  defaultConfig: { startAt: 0 },
  stateValidator: z.object({ count: z.int() }),
  getInitialState: ({ config }) => ({ count: config.startAt }),
  initialise: async () => {},
  buildActions: ({ createAction }) => {
    return {
      increment: createAction({
        payloadValidator: z.object({ by: z.number() }),
        pureFn: async ({ stateDraft, payload }) => {
          stateDraft.count += payload.by;
        },
      }),
    };
  },
});
