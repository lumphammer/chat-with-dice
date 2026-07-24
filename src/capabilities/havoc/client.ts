import { createClientCapability } from "#/capabilities/createClientCapability";
import { SidebarAdversaries } from "#/components/capabilityComponents/SidebarAdversaries/SidebarAdversaries";
import { SidebarObjectives } from "#/components/capabilityComponents/SidebarObjectives/SidebarObjectives";
import { havocCommon } from "./common";
import { Check, Swords } from "lucide-react";

export const havocClient = createClientCapability(havocCommon, {
  sidebarInfos: [
    {
      key: "adversaries",
      label: "Adversaries",
      SidebarComponent: SidebarAdversaries,
      IconComponent: Swords,
    },
    {
      key: "objectives",
      label: "Objectives",
      SidebarComponent: SidebarObjectives,
      IconComponent: Check,
    },
  ],
});
