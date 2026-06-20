import { createServerCapability } from "#/capabilities/createServerCapability";
import { counterCommon } from "./common";

export const counterServer = createServerCapability(counterCommon, {
  initialise: () => {},
});
