import { structuredRollsSchema } from "#/validators/rpgDieRollerResulsSchemas";
import type { StandardFormula, StandardResult } from "./standardRollValidators";
import { DiceRoll } from "@dice-roller/rpg-dice-roller";

export const standardRollHandler = (
  formula: StandardFormula,
): StandardResult => {
  let diceRoll: DiceRoll;
  try {
    diceRoll = new DiceRoll(formula);
  } catch (e: unknown) {
    throw new Error("Couldn't parse dice formula", { cause: e });
  }
  // Store the full structured rolls from the library so the frontend can
  // render dropped, exploded, rerolled, etc. with proper visual treatment.
  const serialized = diceRoll.toJSON();
  const rolls = structuredRollsSchema.parse(serialized.rolls);
  return {
    rolls,
    total: serialized.total,
  };
};
