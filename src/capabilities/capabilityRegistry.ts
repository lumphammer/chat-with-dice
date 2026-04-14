import { SidebarAdversaries } from "#/components/capabilityComponents/SidebarAdversaries/SidebarAdversaries";
import { SidebarCounter } from "#/components/capabilityComponents/SidebarCounter";
import { SidebarObjectives } from "#/components/capabilityComponents/SidebarObjectives/SidebarObjectives";
import { adversariesCapability } from "./adversariesCapability";
import { counterCapability } from "./counterCapability";
import { objectivesCapability } from "./objectivesCapability";
import type { AnyCapability } from "./types";
import { Check, SquarePlus, Swords } from "lucide-react";
import type { ComponentType } from "react";

type CapabilityInfo = {
  capability: AnyCapability;
  sidebarInfos?: SidebarInfo[];
};

type SidebarInfo = {
  key: string;
  SidebarComponent: ComponentType;
  IconComponent: ComponentType;
};

const capabilityNames = ["counter", "objectives", "adversaries"] as const;
export type CapabilityName = (typeof capabilityNames)[number];

export const capabilityRegistry: Record<CapabilityName, CapabilityInfo> = {
  counter: {
    capability: counterCapability,
    sidebarInfos: [
      {
        key: "counter",
        SidebarComponent: SidebarCounter,
        IconComponent: SquarePlus,
      },
    ],
  },
  objectives: {
    capability: objectivesCapability,
    sidebarInfos: [
      {
        key: "objectives",
        SidebarComponent: SidebarObjectives,
        IconComponent: Check,
      },
    ],
  },
  adversaries: {
    capability: adversariesCapability,
    sidebarInfos: [
      {
        key: "adversaries",
        SidebarComponent: SidebarAdversaries,
        IconComponent: Swords,
      },
    ],
  },
};

export function isCapabilityName(name: string): name is CapabilityName {
  return name in capabilityRegistry;
}
