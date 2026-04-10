import { createRollType } from "../createRollType";
// import { GeeseDisplay } from "./GeeseDisplay";
import { GeeseInputUI } from "./GeeseInputUI";
import { geeseHandler } from "./geeseHandler";
import { geeseFormulaValidator, geeseResultValidator } from "./geeseValidators";

export const geeseRollType = createRollType({
  formulaValidator: geeseFormulaValidator,
  resultValidator: geeseResultValidator,
  // DisplayComponent: GeeseDisplay,
  InputComponent: GeeseInputUI,
  DisplayComponent: () => null,
  handler: geeseHandler,
  defaultFormula: {
    action: "start" as const,
    numDice: 1,
  },
});
