import { SIX } from "#/constants";
import { z } from "zod";

const rollFacesValidator = z.array(z.array(z.int().min(1).max(SIX)));

export const honkD6FormulaValidator = z.discriminatedUnion("action", [
  // start a new scheme
  z.object({
    action: z.literal("start"),
    numDice: z.int().min(1),
    schemeDescription: z.string().min(1).optional(),
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

export const honkD6ResultValidator = z.discriminatedUnion("action", [
  // result for a start, commit, or explode
  z.object({
    action: z.literal("roll"),
    faces: rollFacesValidator,
    totalSuccesses: z.int(),
    problemCount: z.int(),
    explodableCount: z.int(),
    consumed: z.enum(["explode", "resolve", "pass"]).optional(),
    previousContributors: z.array(
      z.object({ userId: z.string(), displayName: z.string() }),
    ),
    schemeDescription: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal("resolve"),
    faces: rollFacesValidator,
    totalSuccesses: z.int(),
    problemCount: z.int(),
    previousContributors: z.array(
      z.object({ userId: z.string(), displayName: z.string() }),
    ),
    schemeDescription: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal("pass"),
    faces: rollFacesValidator,
    totalSuccesses: z.int(),
    problemCount: z.int(),
    previousContributors: z.array(
      z.object({ userId: z.string(), displayName: z.string() }),
    ),
    consumedBy: z
      .object({
        userId: z.string(),
        displayName: z.string(),
      })
      .optional(),
    consumed: z.literal("resolve").optional(),
    schemeDescription: z.string().min(1).optional(),
  }),
]);

export type HonkD6Formula = z.infer<typeof honkD6FormulaValidator>;
export type HonkD6Result = z.infer<typeof honkD6ResultValidator>;
