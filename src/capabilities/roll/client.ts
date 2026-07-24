import { createClientCapability } from "#/capabilities/createClientCapability";
import { RollResultDisplay } from "#/components/capabilityComponents/SidebarRoll/RollResultDisplay";
import { SidebarRoll } from "#/components/capabilityComponents/SidebarRoll/SidebarRoll";
import { rollCommon } from "./common";
import { Dices } from "lucide-react";

export const rollClient = createClientCapability(rollCommon, {
  sidebarInfos: [
    {
      key: "roll",
      label: "Roll dice",
      SidebarComponent: SidebarRoll,
      IconComponent: Dices,
    },
  ],
  ChatDisplayComponent: RollResultDisplay,
});
