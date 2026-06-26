import { createClientCapability } from "#/capabilities/createClientCapability";
import { usersCommon } from "./common";

export const usersClient = createClientCapability(usersCommon, {
  visibility: "dev",
  // sidebarInfos: [],
});
