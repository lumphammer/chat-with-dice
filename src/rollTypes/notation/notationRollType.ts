import { DiceRollResult } from "#/rollTypes/notation/DiceRollResult";
import { defineRoll } from "../defineRoll";
import { NotationInput } from "./NotationInput";
import { notationRollHandler } from "./notationRollHandler";
import {
  notationFormulaValidator,
  notationResultValidator,
} from "./notationRollValidators";

export const notationRollType = defineRoll({
  formulaValidator: notationFormulaValidator,
  resultValidator: notationResultValidator,
  InputComponent: NotationInput,
  handler: notationRollHandler,
  DisplayComponent: DiceRollResult,
  defaultFormula: "1d6+0",
});
