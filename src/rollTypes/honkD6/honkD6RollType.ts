import { createRollType } from "../createRollType";
import { HonkD6Display } from "./components/HonkD6Display";
import { HonkD6InputUI } from "./components/HonkD6InputUI";
import { honkD6Handler } from "./honkD6Handler";
import {
  honkD6FormulaValidator,
  honkD6ResultValidator,
} from "./honkD6Validators";

export const honkD6RollType = createRollType({
  formulaValidator: honkD6FormulaValidator,
  resultValidator: honkD6ResultValidator,
  DisplayComponent: HonkD6Display,
  InputComponent: HonkD6InputUI,
  handler: honkD6Handler,
  defaultFormula: {
    action: "start" as const,
    numDice: 1,
  },
});
