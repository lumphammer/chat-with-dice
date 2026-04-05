import { createCapability } from "./createCapability";
import { z } from "zod/v4";

export const geeseCapability = createCapability({
  name: "counter",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: z.object({ count: z.int() }),
  getInitialState: ({ config }) => ({ count: config.startAt }),
  initialise: async () => {},
  buildActions: ({ createAction }) => {
    return {
      explode: createAction({
        payloadValidator: z.object({ messageId: z.string() }),
        effectfulFn: async ({
          payload: { messageId },
          messageRepository,
          broadcaster,
        }) => {
          const message = await messageRepository.getById(messageId);
          if (message === undefined) return;
          broadcaster.broadcast({
            type: "messageUpdate",
            payload: { messageId, message },
          });
        },
      }),
    };
  },
});
