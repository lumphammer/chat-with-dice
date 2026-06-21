import { createClientCapability } from "#/capabilities/createClientCapability";
import { SidebarObjectives } from "#/components/capabilityComponents/SidebarObjectives/SidebarObjectives";
import { objectivesCommon } from "./common";
import { Check } from "lucide-react";

export const objectivesClient = createClientCapability(objectivesCommon, {
  visibility: "public",
  sidebarInfos: [
    {
      key: "objectives",
      SidebarComponent: SidebarObjectives,
      IconComponent: Check,
    },
  ],
});
