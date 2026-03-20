import { rollTypeRegistry } from "./rollTypeRegistry";
import type { RollType } from "./types";

export const isRollType = (x: string): x is RollType => {
  return x in rollTypeRegistry;
};

export function assertRollType(x: string): asserts x is RollType {
  if (!isRollType(x)) {
    throw new Error(`Invalid roll type: ${x}`);
  }
}
