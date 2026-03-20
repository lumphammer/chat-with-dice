import type { StandardFormula } from "./standardRollValidators";
import { DiceRoll } from "@dice-roller/rpg-dice-roller";

export const formulaHandler = (formula: StandardFormula) => {
  let roll: DiceRoll | null;
  try {
    roll = formula ? new DiceRoll(formula) : null;
  } catch (e: unknown) {
    throw new Error("Couldn't parse dice formula", { cause: e });
  }
  // Store the full structured rolls from the library so the frontend can
  // render dropped, exploded, rerolled, etc. with proper visual treatment.
  const result = roll ? JSON.stringify(roll.toJSON().rolls) : "";
  return { formula, result };
};
