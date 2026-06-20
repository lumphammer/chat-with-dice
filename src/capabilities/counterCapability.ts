import { counterClient } from "./counter/client";
import { counterCommon } from "./counter/common";
import { counterServer } from "./counter/server";

/**
 * Transitional re-export. The capability is now defined in three files under
 * `./counter/` (common / server / client); this file merges the halves back
 * into the old combined shape so `capabilityRegistry.ts` and the React
 * components that import `counterCapability.useMount()` keep working until the
 * registry is split (step 5 of the capability untangle).
 *
 * Once `serverCapabilityRegistry` and `clientCapabilityRegistry` exist this
 * file should be deleted and the registries should import from
 * `./counter/server` and `./counter/client` directly.
 */
export const counterCapability = {
  name: counterServer.name,
  displayName: counterServer.displayName,
  defaultConfig: counterCommon.defaultConfig,
  mount: counterServer.mount,
  useMount: counterClient.useMount,
  visibility: counterClient.visibility,
  sidebarInfos: counterClient.sidebarInfos,
  ChatDisplayComponent: counterClient.ChatDisplayComponent,
};
