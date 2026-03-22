import type { StructuredRolls } from "#/validators/rpgDieRollerResulsTypes";
import { isDicePool } from "./isDicePool";

export function isPoolRoll(structured: StructuredRolls): boolean {
  for (const entry of structured) {
    if (typeof entry === "object" && entry.type === "roll-results") {
      if (isDicePool(entry)) return true;
    }
  }
  return false;
}
