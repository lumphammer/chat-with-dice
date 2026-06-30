import { createClientCapability } from "#/capabilities/createClientCapability";
import { SidebarAdversaries } from "#/components/capabilityComponents/SidebarAdversaries/SidebarAdversaries";
import { adversariesCommon } from "./common";
import { Swords } from "lucide-react";

export const adversariesClient = createClientCapability(adversariesCommon, {
  sidebarInfos: [
    {
      key: "adversaries",
      SidebarComponent: SidebarAdversaries,
      IconComponent: Swords,
    },
  ],
});
