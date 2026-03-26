import { createCapability } from "./capabilities";
import { z } from "zod/v4";

const counterCapabilityStateValidator = z.object({ count: z.int() });

export const counterCapability = createCapability({
  name: "Counter",
  configValidator: z.object({ startAt: z.int() }),
  stateValidator: counterCapabilityStateValidator,
  getInitialState: ({ config }) => ({ count: config.startAt }),
  initialise: async () => {},
  buildActions: (createAction) => ({
    increment: createAction(
      z.object({ by: z.number() }),
      async ({ stateDraft, payload }) => {
        stateDraft.count += payload.by;
      },
    ),
  }),
});
