import { feedbackClient } from "./feedback/client";
import { feedbackCommon } from "./feedback/common";
import { feedbackServer } from "./feedback/server";

/**
 * Transitional shim (see counterCapability.ts for context). Merges the
 * server + client halves so the existing registry and UI consumers keep
 * working until the registry split.
 */
export const feedbackTestCapability = {
  name: feedbackServer.name,
  displayName: feedbackServer.displayName,
  defaultConfig: feedbackCommon.defaultConfig,
  mount: feedbackServer.mount,
  useMount: feedbackClient.useMount,
  visibility: feedbackClient.visibility,
  sidebarInfos: feedbackClient.sidebarInfos,
  ChatDisplayComponent: feedbackClient.ChatDisplayComponent,
};
