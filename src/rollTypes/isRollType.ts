import { rollTypeRegistry, type RollTypeName } from "./rollTypeRegistry";

export const isRollType = (x: string): x is RollTypeName => {
  return x in rollTypeRegistry;
};

export function assertRollType(x: string): asserts x is RollTypeName {
  if (!isRollType(x)) {
    throw new Error(`Invalid roll type: ${x}`);
  }
}
