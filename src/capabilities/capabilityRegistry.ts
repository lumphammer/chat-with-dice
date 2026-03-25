import type { AnyCapability } from "./capabilities";
import { counterCapability } from "./counterCapability";

export const capabilityRegistry: Record<string, AnyCapability> = {
  counter: counterCapability,
};
