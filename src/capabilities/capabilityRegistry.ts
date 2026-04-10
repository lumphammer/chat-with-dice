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
  sidebarComponent?: ComponentType;
  iconComponent: ComponentType;
};

export const capabilityRegistry: Record<string, CapabilityInfo> = {
  counter: {
    capability: counterCapability,
    sidebarComponent: SidebarCounter,
    iconComponent: SquarePlus,
  },
  objectives: {
    capability: objectivesCapability,
    sidebarComponent: SidebarObjectives,
    iconComponent: Check,
  },
  adversaries: {
    capability: adversariesCapability,
    sidebarComponent: SidebarAdversaries,
    iconComponent: Swords,
  },
};

export type CapabilityName = keyof typeof capabilityRegistry;

export function isCapabilityName(name: string): name is CapabilityName {
  return name in capabilityRegistry;
}
