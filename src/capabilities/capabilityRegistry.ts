import { SidebarCounter } from "#/components/capabilityComponents/SidebarCounter";
import { SidebarObjectives } from "#/components/capabilityComponents/SidebarObjectives";
import { counterCapability } from "./counterCapability";
import { objectivesCapability } from "./objectivesCapability";
import type { AnyCapability } from "./types";
import type { ComponentType } from "react";

type CapabilityInfo = {
  capability: AnyCapability;
  sidebarComponent: ComponentType;
};

export const capabilityRegistry = {
  counter: { capability: counterCapability, sidebarComponent: SidebarCounter },
  objectives: {
    capability: objectivesCapability,
    sidebarComponent: SidebarObjectives,
  },
} satisfies Record<string, CapabilityInfo>;

export type CapabilityName = keyof typeof capabilityRegistry;

export function isCapabilityName(name: string): name is CapabilityName {
  return name in capabilityRegistry;
}
