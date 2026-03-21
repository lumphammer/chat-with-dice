import { DiceRollResult } from "#/components/DiceRoller/DiceRollResult";
import { defineRoll } from "../defineRoll";
import { StandardDieRollForm } from "./StandardDieRollForm/StandardDieRollForm";
import { standardRollHandler } from "./standardRollHandler";
import {
  standardFormulaValidator,
  standardResultValidator,
} from "./standardRollValidators";

export const standardRollType = defineRoll({
  formulaValidator: standardFormulaValidator,
  resultValidator: standardResultValidator,
  InputComponent: StandardDieRollForm,
  handler: standardRollHandler,
  DisplayComponent: DiceRollResult,
});
