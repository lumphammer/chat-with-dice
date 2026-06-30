import { createClientCapability } from "#/capabilities/createClientCapability";
import { SidebarCounter } from "#/components/capabilityComponents/SidebarCounter";
import { counterCommon } from "./common";
import { SquarePlus } from "lucide-react";

export const counterClient = createClientCapability(counterCommon, {
  sidebarInfos: [
    {
      key: "counter",
      SidebarComponent: SidebarCounter,
      IconComponent: SquarePlus,
    },
  ],
});
