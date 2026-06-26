import { createServerCapability } from "#/capabilities/createServerCapability";
import { usersCommon } from "./common";

export const usersServer = createServerCapability(usersCommon, {});
