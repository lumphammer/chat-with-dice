import { DiceRollResult } from "#/components/DiceRoller/DiceRollResult";
import { defineRoll } from "../defineRoll";
import {
  standardFormulaValidator,
  standardResultValidator,
} from "./standardRollValidators";

export const standardRollType = defineRoll({
  formulaValidator: standardFormulaValidator,
  resultValidator: standardResultValidator,
  ResultDisplay: DiceRollResult,
});
