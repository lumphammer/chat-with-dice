import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

export const counterCommon = createCapabilityCommon({
  name: "counter",
  displayName: "Counter",
  visibility: "public",
  config: {
    validator: z.object({ startAt: z.int() }),
    default: { startAt: 0 },
  },
  state: {
    validator: z.object({
      count: z.int(),
    }),
    getInitialState: ({ config }) => ({ count: config.startAt }),
  },
  buildActions: ({ createAction }) => ({
    increment: createAction({
      payloadValidator: z.object({ by: z.number() }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.count += payload.by;
      },
    }),
  }),
});
