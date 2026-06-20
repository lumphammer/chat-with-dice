import { adversariesClient } from "./adversaries/client";
import { adversariesCommon } from "./adversaries/common";
import { adversariesServer } from "./adversaries/server";

/**
 * Transitional shim (see counterCapability.ts for context). Merges the
 * server + client halves so the existing registry and UI consumers keep
 * working until the registry split.
 */
export const adversariesCapability = {
  name: adversariesServer.name,
  displayName: adversariesServer.displayName,
  defaultConfig: adversariesCommon.defaultConfig,
  mount: adversariesServer.mount,
  useMount: adversariesClient.useMount,
  visibility: adversariesClient.visibility,
  sidebarInfos: adversariesClient.sidebarInfos,
  ChatDisplayComponent: adversariesClient.ChatDisplayComponent,
};
