import { SIX } from "#/constants";
import type { GeeseFormula, GeeseResult } from "./geeseValidators";

const GEESE_SUCCESS_MIN = 4;

function d6(): number {
  return Math.floor(Math.random() * SIX) + 1;
}

export function geeseHandler(formula: GeeseFormula): GeeseResult {
  if (formula.action === "resolve") {
    return {
      action: "resolve",
      rounds: formula.rounds,
      totalSuccesses: formula.totalSuccesses,
    };
  }

  if (formula.action === "pass") {
    return {
      action: "pass",
      rounds: formula.rounds,
      totalSuccesses: formula.totalSuccesses,
      rollerChatId: formula.rollerChatId,
      passedSuccesses: Math.max(0, formula.totalSuccesses - 1),
    };
  }

  // action === "roll"
  const newRound = Array.from({ length: formula.numDice }, () => d6());
  const rounds = [...formula.previousRounds, newRound];

  const diceSuccesses = rounds
    .flat()
    .filter((v) => v >= GEESE_SUCCESS_MIN).length;
  const totalSuccesses = diceSuccesses + formula.inheritedSuccesses;
  const explodingCount = newRound.filter((v) => v >= GEESE_SUCCESS_MIN).length;

  return {
    action: "roll",
    rounds,
    totalSuccesses,
    inheritedSuccesses: formula.inheritedSuccesses,
    explodingCount,
  };
}
