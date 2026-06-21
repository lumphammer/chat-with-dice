import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

export const feedbackCommon = createCapabilityCommon({
  name: "feedback",
  displayName: "Feedback test",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: z.object({}),
  getInitialState: () => ({}),
  buildActions: () => ({}),
});
