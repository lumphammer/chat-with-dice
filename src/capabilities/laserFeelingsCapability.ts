import { laserfeelingsClient } from "./laserfeelings/client";
import { laserfeelingsCommon } from "./laserfeelings/common";
import { laserfeelingsServer } from "./laserfeelings/server";

/**
 * Transitional shim (see counterCapability.ts for context). Merges the
 * server + client halves so the existing registry and UI consumers keep
 * working until the registry split. Forwards the validator / type / constant
 * exports that React components in `SidebarLaserFeelings/` consume.
 */
export {
  DEFAULT_NUMBER_OF_DICE,
  DEFAULT_YOUR_NUMBER,
  NUMBER_OF_DICE_OPTIONS,
  YOUR_NUMBER_OPTIONS,
  yourNumberValidator,
  numberOfDiceValidator,
  modeValidator,
  formulaValidator,
  faceValidator,
  messageDataValidator,
  type Face,
  type Formula,
  type Mode,
  type NumberOfDice,
  type YourNumber,
} from "./laserfeelings/common";

export const laserFeelingsCapability = {
  name: laserfeelingsServer.name,
  displayName: laserfeelingsServer.displayName,
  defaultConfig: laserfeelingsCommon.defaultConfig,
  mount: laserfeelingsServer.mount,
  useMount: laserfeelingsClient.useMount,
  visibility: laserfeelingsClient.visibility,
  sidebarInfos: laserfeelingsClient.sidebarInfos,
  ChatDisplayComponent: laserfeelingsClient.ChatDisplayComponent,
};
