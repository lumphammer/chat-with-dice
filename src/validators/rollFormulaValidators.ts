// import type { RollType } from "#/types";
// import { z } from "zod";

// export const rollFormulaValidators = {
//   f20: z.object({
//     critOn: z.int().min(1),
//     fumbleOn: z.int().min(1),
//     modifier: z.int().default(0),
//     advantageOrDisadvanatage: z.enum(["advantage", "disadvantage"]).optional(),
//     target: z.int().min(1).optional(),
//   }),
//   formula: z.string(),
//   fitd: z.object({
//     numDice: z.int().min(1),
//   }),
//   havoc: z.object({
//     numDice: z.int().min(1),
//   }),
//   standard: z.string(),
// } satisfies Record<RollType, z.ZodTypeAny>;
