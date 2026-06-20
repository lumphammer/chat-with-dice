import { filesClient } from "./files/client";
import { filesCommon } from "./files/common";
import { filesServer } from "./files/server";

/**
 * Transitional shim (see counterCapability.ts for context). Merges the
 * server + client halves so the existing registry and UI consumers keep
 * working until the registry split. Forwards validators / types that React
 * components in `components/capabilityComponents/Files/` and other consumers
 * (e.g. `workers/ChatRoomDO/types.ts`) consume.
 */
export {
  filesStateValidator,
  sharedItemMessageDataValidator,
  type FilesState,
  type SharedItem,
} from "./files/common";

export const filesCapability = {
  name: filesServer.name,
  displayName: filesServer.displayName,
  defaultConfig: filesCommon.defaultConfig,
  mount: filesServer.mount,
  useMount: filesClient.useMount,
  visibility: filesClient.visibility,
  sidebarInfos: filesClient.sidebarInfos,
  ChatDisplayComponent: filesClient.ChatDisplayComponent,
};
