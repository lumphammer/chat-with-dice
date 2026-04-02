import { counterCapability } from "./counterCapability";
import type { AnyCapability } from "./createCapability";

export const capabilityRegistry = {
  counter: counterCapability,
} satisfies Record<string, AnyCapability>;

export type CapabilityName = keyof typeof capabilityRegistry;

export function isCapabilityName(name: string): name is CapabilityName {
  return name in capabilityRegistry;
}
