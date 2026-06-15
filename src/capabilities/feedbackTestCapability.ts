import { createCapability } from "./createCapability";
import { z } from "zod/v4";

export const feedbackTestCapability = createCapability({
  name: "feedback",
  displayName: "Feedback test",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: z.object({}),
  getInitialState: ({ config }) => ({ count: config.startAt }),
  initialise: async () => {},
  buildActions: () => {
    return {};
  },
});
