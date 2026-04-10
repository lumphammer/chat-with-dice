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
  updateMessage,
  chatId,
  displayName,
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

  // commits must follow passes
  if (formula.action === "commit") {
    if (previous.results.action !== "pass") {
      throw new Error("Previous message did not result in a pass");
    }
    const [faces, successCount] = roll(formula.numDice);
    previous.results.consumedBy = {
      chatId,
      displayName,
    };
    updateMessage(previous);

    return {
      action: "roll",
      faces: [...previous.results.faces, faces],
      totalSuccesses: previous.results.totalSuccesses + successCount,
      explodableCount: successCount,
    } satisfies GeeseResult;
  }

  // everything else requires a roll, so we check that here
  if (previous.results.action !== "roll") {
    throw new Error("Previous message did not result in a roll");
  }

  // explode
  if (formula.action === "explode") {
    const [faces, successCount] = roll(previous.results.explodableCount);
    previous.results.consumed = "explode";
    updateMessage(previous);
    return {
      action: "roll",
      faces: [...previous.results.faces, faces],
      totalSuccesses: previous.results.totalSuccesses + successCount,
      explodableCount: successCount,
    } satisfies GeeseResult;
  }

  // resolve
  if (formula.action === "resolve") {
    previous.results.consumed = "resolve";
    updateMessage(previous);
    return {
      action: "resolve",
      faces: previous.results.faces,
      totalSuccesses: previous.results.totalSuccesses,
    } satisfies GeeseResult;
  }

  // pass
  if (formula.action === "pass") {
    previous.results.consumed = "pass";
    updateMessage(previous);
    return {
      action: "pass",
      faces: previous.results.faces,
      totalSuccesses: previous.results.totalSuccesses - 1,
    } satisfies GeeseResult;
  }

  throw new Error("Invalid action");
};
