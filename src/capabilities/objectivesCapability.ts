import { objectivesClient } from "./objectives/client";
import { objectivesCommon } from "./objectives/common";
import { objectivesServer } from "./objectives/server";

/**
 * Transitional shim (see counterCapability.ts for context). Merges the
 * server + client halves so the existing registry and UI consumers keep
 * working until the registry split.
 */
export const objectivesCapability = {
  name: objectivesServer.name,
  displayName: objectivesServer.displayName,
  defaultConfig: objectivesCommon.defaultConfig,
  mount: objectivesServer.mount,
  useMount: objectivesClient.useMount,
  visibility: objectivesClient.visibility,
  sidebarInfos: objectivesClient.sidebarInfos,
  ChatDisplayComponent: objectivesClient.ChatDisplayComponent,
};
