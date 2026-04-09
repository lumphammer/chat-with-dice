import { DiceRollResult } from "#/rollTypes/notation/DiceRollResult";
import { createRollType } from "../createRollType";
import { StandardDieRollForm } from "./StandardDieRollForm/StandardDieRollForm";
import { standardRollHandler } from "./standardRollHandler";
import {
  standardFormulaValidator,
  standardResultValidator,
} from "./standardRollValidators";

export const standardRollType = createRollType({
  formulaValidator: standardFormulaValidator,
  resultValidator: standardResultValidator,
  InputComponent: StandardDieRollForm,
  handler: standardRollHandler,
  DisplayComponent: DiceRollResult,
  defaultFormula: "1d6+0",
});
