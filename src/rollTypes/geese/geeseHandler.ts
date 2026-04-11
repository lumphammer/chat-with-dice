import { SIX } from "#/constants";
import type { RollHandler } from "../createRollType";
import type { GeeseFormula, GeeseResult } from "./geeseValidators";

const GEESE_SUCCESS_MIN = 4;

function d6(): number {
  return Math.floor(Math.random() * SIX) + 1;
}

const roll = (numDice: number) => {
  const faces = Array.from({ length: numDice }, d6);
  const successCount = faces.filter((v) => v >= GEESE_SUCCESS_MIN).length;
  const problemCount = faces.filter((v) => v === 1).length;
  return [faces, successCount, problemCount] as const;
};

export const geeseHandler: RollHandler<GeeseFormula, GeeseResult> = async ({
  formula,
  getMessage,
  updateMessage,
  chatId,
  displayName,
}) => {
  if (formula.action === "start") {
    const [faces, successCount, problemCount] = roll(formula.numDice);
    return {
      action: "roll",
      faces: [faces],
      totalSuccesses: successCount,
      problemCount: problemCount,
      explodableCount: successCount,
      previousContributors: [{ chatId, displayName }],
      schemeDescription: formula.schemeDescription,
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
    const [faces, successCount, problemCount] = roll(formula.numDice);
    previous.results.consumedBy = { chatId, displayName };
    updateMessage(previous);

    return {
      action: "roll",
      faces: [...previous.results.faces, faces],
      totalSuccesses: previous.results.totalSuccesses + successCount,
      problemCount: problemCount,
      explodableCount: successCount,
      previousContributors: [
        ...previous.results.previousContributors,
        { chatId, displayName },
      ],
      schemeDescription: previous.results.schemeDescription,
    } satisfies GeeseResult;
  }

  // resolve — can follow a roll OR a pass
  if (formula.action === "resolve") {
    if (
      previous.results.action !== "roll" &&
      previous.results.action !== "pass"
    ) {
      throw new Error("Can only resolve a roll or a pass");
    }
    if (previous.results.action === "roll") {
      previous.results.consumed = "resolve";
    } else {
      previous.results.consumed = "resolve";
    }
    updateMessage(previous);
    return {
      action: "resolve",
      faces: previous.results.faces,
      totalSuccesses: previous.results.totalSuccesses,
      problemCount: previous.results.problemCount,
      previousContributors: [...previous.results.previousContributors],
      schemeDescription: previous.results.schemeDescription,
    } satisfies GeeseResult;
  }

  // everything else requires a roll, so we check that here
  if (previous.results.action !== "roll") {
    throw new Error("Previous message did not result in a roll");
  }

  // explode
  if (formula.action === "explode") {
    const [faces, successCount, problemCount] = roll(
      previous.results.explodableCount,
    );
    previous.results.consumed = "explode";
    updateMessage(previous);
    return {
      action: "roll",
      faces: [...previous.results.faces, faces],
      totalSuccesses: previous.results.totalSuccesses + successCount,
      problemCount: previous.results.problemCount + problemCount,
      explodableCount: successCount,
      previousContributors: [...previous.results.previousContributors],
      schemeDescription: previous.results.schemeDescription,
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
      problemCount: previous.results.problemCount,
      previousContributors: [...previous.results.previousContributors],
      schemeDescription: previous.results.schemeDescription,
    } satisfies GeeseResult;
  }

  throw new Error("Invalid action");
};
