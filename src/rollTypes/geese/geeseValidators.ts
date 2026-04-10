import { SIX } from "#/constants";
import { z } from "zod";

const rollFacesValidator = z.array(z.array(z.int().min(1).max(SIX)));

export const geeseFormulaValidator = z.discriminatedUnion("action", [
  // start a new scheme
  z.object({
    action: z.literal("start"),
    numDice: z.int().min(1),
  }),
  // explode the results of a start or a commit
  z.object({
    action: z.literal("explode"),
    previousMessageId: z.string(),
  }),
  // resolve a start, explode, or pass
  z.object({
    action: z.literal("resolve"),
    previousMessageId: z.string(),
  }),
  // pass on a start, explode, or commit to other players
  z.object({
    action: z.literal("pass"),
    previousMessageId: z.string(),
  }),
  // pick up another player's pass and commit to their scheme
  z.object({
    action: z.literal("commit"),
    numDice: z.int().min(1),
    previousMessageId: z.string(),
  }),
]);

export const geeseResultValidator = z.discriminatedUnion("action", [
  // result for a start, commit, or explode
  z.object({
    action: z.literal("roll"),
    faces: rollFacesValidator,
    totalSuccesses: z.int(),
    problemCount: z.int(),
    explodableCount: z.int(),
    consumed: z.enum(["explode", "resolve", "pass"]).optional(),
    previousContributors: z.array(
      z.object({ chatId: z.string(), displayName: z.string() }),
    ),
  }),
  z.object({
    action: z.literal("resolve"),
    faces: rollFacesValidator,
    totalSuccesses: z.int(),
    problemCount: z.int(),
    previousContributors: z.array(
      z.object({ chatId: z.string(), displayName: z.string() }),
    ),
  }),
  z.object({
    action: z.literal("pass"),
    faces: rollFacesValidator,
    totalSuccesses: z.int(),
    problemCount: z.int(),
    previousContributors: z.array(
      z.object({ chatId: z.string(), displayName: z.string() }),
    ),
    consumedBy: z
      .object({
        chatId: z.string(),
        displayName: z.string(),
      })
      .optional(),
    consumed: z.literal("resolve").optional(),
  }),
]);

export type GeeseFormula = z.infer<typeof geeseFormulaValidator>;
export type GeeseResult = z.infer<typeof geeseResultValidator>;
