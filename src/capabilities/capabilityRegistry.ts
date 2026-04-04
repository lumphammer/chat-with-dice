import { SidebarCounter } from "#/components/DiceRoller/SidebarCounter";
import { counterCapability } from "./counterCapability";
import type { AnyCapability } from "./types";
import type { ComponentType } from "react";

type CapabilityInfo = {
  capability: AnyCapability;
  sidebarComponent: ComponentType;
};

export const capabilityRegistry = {
  counter: { capability: counterCapability, sidebarComponent: SidebarCounter },
} satisfies Record<string, CapabilityInfo>;

export type CapabilityName = keyof typeof capabilityRegistry;

export function isCapabilityName(name: string): name is CapabilityName {
  return name in capabilityRegistry;
}
