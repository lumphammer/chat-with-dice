import { SIX } from "#/constants";
import type { RollHandler } from "../createRollType";
import type { GeeseFormula, GeeseResult } from "./geeseValidators";

const GEESE_SUCCESS_MIN = 4;

function d6(): number {
  return Math.floor(Math.random() * SIX) + 1;
}

const roll = (numDice: number) => {
  const faces = Array.from({ length: numDice }, d6);

  const successCount = faces
    .flat()
    .filter((v) => v >= GEESE_SUCCESS_MIN).length;
  return [faces, successCount] as const;
};

export const geeseHandler: RollHandler<GeeseFormula, GeeseResult> = async ({
  formula,
  getMessage,
}) => {
  if (formula.action === "start") {
    const [faces, successCount] = roll(formula.numDice);
    return {
      action: "roll",
      faces: [faces],
      totalSuccesses: successCount,
      explodableCount: successCount,
    } satisfies GeeseResult;
  }

  // every other action should have a previousMessageId, so we can fetch that
  // now
  const previous = await getMessage(formula.previousMessageId);

  if (formula.action === "explode") {
    if (previous.results.action !== "roll") {
      throw new Error("Previous message did not result in a roll");
    }
    const [faces, successCount] = roll(previous.results.explodableCount);
    return {
      action: "roll",
      faces: [...previous.results.faces, faces],
      totalSuccesses: previous.results.totalSuccesses + successCount,
      explodableCount: successCount,
    } satisfies GeeseResult;
  }

  if (formula.action === "resolve") {
    return {
      action: "resolve",
      faces: previous.results.faces,
      totalSuccesses: previous.results.totalSuccesses,
    } satisfies GeeseResult;
  }

  if (formula.action === "pass") {
    return {
      action: "pass",
      faces: previous.results.faces,
      totalSuccesses: previous.results.totalSuccesses - 1,
    } satisfies GeeseResult;
  }

  if (formula.action === "commit") {
    const [faces, successCount] = roll(formula.numDice);

    return {
      action: "roll",
      faces: [...previous.results.faces, faces],
      totalSuccesses: previous.results.totalSuccesses + successCount,
      explodableCount: successCount,
    } satisfies GeeseResult;
  }

  throw new Error("Invalid action");
};
