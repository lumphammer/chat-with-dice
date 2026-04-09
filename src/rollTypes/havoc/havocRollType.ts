import { createRollType } from "../createRollType";
import { HavocDisplay, HavocInputUI } from "./HavocComponents";
import { havocHandler } from "./havocHandler";
import { havocFormulaValidator, havocResultValidator } from "./havocValidators";

export const havocRollType = createRollType({
  formulaValidator: havocFormulaValidator,
  resultValidator: havocResultValidator,
  DisplayComponent: HavocDisplay,
  InputComponent: HavocInputUI,
  handler: havocHandler,
  defaultFormula: {
    numDice: 1,
  },
});
