import { DiceRollResult } from "#/rollTypes/notation/DiceRollResult";
import { createRollType } from "../createRollType";
import { NotationInput } from "./NotationInput";
import { notationRollHandler } from "./notationRollHandler";
import {
  notationFormulaValidator,
  notationResultValidator,
} from "./notationRollValidators";

export const notationRollType = createRollType({
  formulaValidator: notationFormulaValidator,
  resultValidator: notationResultValidator,
  InputComponent: NotationInput,
  handler: notationRollHandler,
  DisplayComponent: DiceRollResult,
  defaultFormula: "1d6+0",
});
