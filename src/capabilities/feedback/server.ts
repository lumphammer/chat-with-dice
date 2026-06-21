import { createServerCapability } from "#/capabilities/createServerCapability";
import { feedbackCommon } from "./common";

export const feedbackServer = createServerCapability(feedbackCommon, {
  initialise: () => {},
});
