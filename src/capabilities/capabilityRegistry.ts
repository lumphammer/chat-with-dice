import { SidebarCounter } from "#/components/capabilityComponents/SidebarCounter";
import { SidebarObjectives } from "#/components/capabilityComponents/SidebarObjectives/SidebarObjectives";
import { counterCapability } from "./counterCapability";
import { objectivesCapability } from "./objectivesCapability";
import type { AnyCapability } from "./types";
import { Check, SquarePlus } from "lucide-react";
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
};

export type CapabilityName = keyof typeof capabilityRegistry;

export function isCapabilityName(name: string): name is CapabilityName {
  return name in capabilityRegistry;
}
