import { SIX } from "#/constants";
import { z } from "zod";

const roundSchema = z.array(z.int().min(1).max(SIX));
const roundsSchema = z.array(roundSchema);

export const geeseFormulaValidator = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("roll"),
    numDice: z.int().min(1),
    previousRounds: roundsSchema,
    /** Successes carried in from a previous player's pass */
    inheritedSuccesses: z.int().min(0),
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
    /** chatId of the player who initiated this roll sequence */
    rollerChatId: z.string(),
  }),
]);

export const geeseResultValidator = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("roll"),
    rounds: roundsSchema,
    /** Total successes: dice successes + any inherited */
    totalSuccesses: z.int(),
    /** Successes inherited from a pass (0 for fresh rolls) */
    inheritedSuccesses: z.int().min(0),
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
    /** chatId of the player who initiated this roll sequence */
    rollerChatId: z.string(),
    /** Successes available to claim (totalSuccesses - 1, min 0) */
    passedSuccesses: z.int().min(0),
  }),
]);

export type GeeseFormula = z.infer<typeof geeseFormulaValidator>;
export type GeeseResult = z.infer<typeof geeseResultValidator>;
