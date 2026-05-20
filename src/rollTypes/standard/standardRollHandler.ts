import { structuredRollsSchema } from "#/validators/rpgDieRollerResulsSchemas";
import type { StandardFormula, StandardResult } from "./standardRollValidators";
import type { DiceRoll } from "@dice-roller/rpg-dice-roller";
import * as z from "zod";

export const standardRollHandler = async ({
  formula,
}: {
  formula: StandardFormula;
}): Promise<StandardResult> => {
  const { DiceRoll } = await import("@dice-roller/rpg-dice-roller");

  let diceRoll: DiceRoll;
  try {
    diceRoll = new DiceRoll(formula.formula);
  } catch (e: unknown) {
    throw new Error("Couldn't parse dice formula", { cause: e });
  }
  // Store the full structured rolls from the library so the frontend can
  // render dropped, exploded, rerolled, etc. with proper visual treatment.

  // we need to work with the serialized format, but rpgDiceRoller cheats in its
  // .toJSON() by returning "raw" children, so we have to stringify and parse.
  const serializable = JSON.parse(JSON.stringify(diceRoll));

  const { data: rolls, error } = structuredRollsSchema.safeParse(
    serializable.rolls,
  );

  if (error) {
    console.error("Error:", JSON.stringify(z.treeifyError(error), null, 2));
    throw error;
  }

  return {
    rolls,
    total: serializable.total,
  };
};
