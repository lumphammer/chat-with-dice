import type { RollType } from "#/types";
import { rollFormulaValidators } from "#/validators/rollFormulaValidators";
import { DiceRoll } from "@dice-roller/rpg-dice-roller";

const formulaHandler = (rawFormula: unknown) => {
  const formula = rollFormulaValidators["formula"].parse(rawFormula);
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

export const rollHandlers = {
  f20: (_formula: unknown) => ({ formula: "", result: "" }),
  fitd: (_formula: unknown) => ({ formula: "", result: "" }),
  formula: formulaHandler,
  havoc: (_formula: unknown) => ({ formula: "", result: "" }),
  standard: formulaHandler,
} satisfies Record<
  RollType,
  (formula: unknown) => { formula: string; result: string }
>;
