import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

export const feedbackCommon = createCapabilityCommon({
  name: "feedback",
  displayName: "Feedback test",
  stateValidator: z.object({}),
  getInitialState: () => ({}),
  buildActions: () => ({}),
});
