import { rollClient } from "./roll/client";
import { rollCommon } from "./roll/common";
import { rollServer } from "./roll/server";

/**
 * Transitional shim (see counterCapability.ts for context). Merges the
 * server + client halves so the existing registry and UI consumers keep
 * working until the registry split. Also forwards the validator / type
 * exports that React components in `SidebarRoll/` consume.
 */
export {
  messageDataValidator,
  rollFormulaValidator,
  keepValidator,
  favourValidator,
  operatorValidator,
  faceValidator,
  handfulValidator,
  favouredHandfulsValidator,
  type Face,
  type Favour,
  type FavouredHandfuls,
  type Handful,
  type Keep,
  type Operator,
} from "./roll/common";

export const rollCapability = {
  name: rollServer.name,
  displayName: rollServer.displayName,
  defaultConfig: rollCommon.defaultConfig,
  mount: rollServer.mount,
  useMount: rollClient.useMount,
  visibility: rollClient.visibility,
  sidebarInfos: rollClient.sidebarInfos,
  ChatDisplayComponent: rollClient.ChatDisplayComponent,
};
