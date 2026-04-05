import { SIX } from "#/constants";
import type { GeeseFormula, GeeseResult } from "./geeseValidators";

const GEESE_SUCCESS_MIN = 4;

function d6(): number {
  return Math.floor(Math.random() * SIX) + 1;
}

export function geeseHandler(formula: GeeseFormula): GeeseResult {
  if (formula.action === "resolve" || formula.action === "pass") {
    return {
      action: formula.action,
      rounds: formula.rounds,
      totalSuccesses: formula.totalSuccesses,
    };
  }

  const newRound = Array.from({ length: formula.numDice }, () => d6());
  const rounds = [...formula.previousRounds, newRound];

  const totalSuccesses = rounds
    .flat()
    .filter((v) => v >= GEESE_SUCCESS_MIN).length;
  const explodingCount = newRound.filter((v) => v >= GEESE_SUCCESS_MIN).length;

  return {
    action: "roll",
    rounds,
    totalSuccesses,
    explodingCount,
  };
}
