import { SIX } from "#/constants";
import { z } from "zod";

const roundSchema = z.array(z.int().min(1).max(SIX));
const roundsSchema = z.array(roundSchema);

export const geeseFormulaValidator = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("roll"),
    numDice: z.int().min(1),
    previousRounds: roundsSchema,
  }),
  z.object({
    action: z.literal("resolve"),
    rounds: roundsSchema,
    totalSuccesses: z.int(),
  }),
  z.object({
    action: z.literal("pass"),
    rounds: roundsSchema,
    totalSuccesses: z.int(),
  }),
]);

export const geeseResultValidator = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("roll"),
    rounds: roundsSchema,
    totalSuccesses: z.int(),
    /** How many dice from the latest round "explode" (scored 4+) and need re-rolling */
    explodingCount: z.int(),
  }),
  z.object({
    action: z.literal("resolve"),
    rounds: roundsSchema,
    totalSuccesses: z.int(),
  }),
  z.object({
    action: z.literal("pass"),
    rounds: roundsSchema,
    totalSuccesses: z.int(),
  }),
]);

export type GeeseFormula = z.infer<typeof geeseFormulaValidator>;
export type GeeseResult = z.infer<typeof geeseResultValidator>;
