import { createRollType } from "../createRollType";
import { GeeseDisplay } from "./components/GeeseDisplay";
import { GeeseInputUI } from "./components/GeeseInputUI";
import { geeseHandler } from "./geeseHandler";
import { geeseFormulaValidator, geeseResultValidator } from "./geeseValidators";

export const geeseRollType = createRollType({
  formulaValidator: geeseFormulaValidator,
  resultValidator: geeseResultValidator,
  DisplayComponent: GeeseDisplay,
  InputComponent: GeeseInputUI,
  handler: geeseHandler,
  defaultFormula: {
    action: "start" as const,
    numDice: 1,
  },
});
