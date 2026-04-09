import { createRollType } from "../createRollType";
import { GeeseDisplay } from "./GeeseDisplay";
import { GeeseInputUI } from "./GeeseInputUI";
import { geeseHandler } from "./geeseHandler";
import { geeseFormulaValidator, geeseResultValidator } from "./geeseValidators";

export const geeseRollType = createRollType({
  formulaValidator: geeseFormulaValidator,
  resultValidator: geeseResultValidator,
  DisplayComponent: GeeseDisplay,
  InputComponent: GeeseInputUI,
  handler: geeseHandler,
  defaultFormula: {
    action: "roll" as const,
    numDice: 1,
    previousRounds: [],
    inheritedSuccesses: 0,
  },
});
