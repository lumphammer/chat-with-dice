import { DiceRollResult } from "#/components/DiceRoller/DiceRollResult";
import { StandardDieRollForm } from "#/components/DiceRoller/StandardDieRollForm/StandardDieRollForm";
import { defineRoll } from "../defineRoll";
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
