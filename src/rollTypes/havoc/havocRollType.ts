import { defineRoll } from "../defineRoll";
import { HavocDisplay, HavocInputUI } from "./HavocComponents";
import { havocHandler } from "./havocHandler";
import { havocFormulaValidator, havocResultValidator } from "./havocValidators";

export const havocRollType = defineRoll({
  formulaValidator: havocFormulaValidator,
  resultValidator: havocResultValidator,
  DisplayComponent: HavocDisplay,
  InputComponent: HavocInputUI,
  handler: havocHandler,
});
