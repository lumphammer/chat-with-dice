import { structuredRollsSchema } from "#/validators/rpgDieRollerResulsSchemas";
import { z } from "zod";

export const notationFormulaValidator = z.object({ formula: z.string() });

export type NotationFormula = z.infer<typeof notationFormulaValidator>;

export const notationResultValidator = z.object({
  rolls: structuredRollsSchema,
  total: z.int(),
});

export type NotationResult = z.infer<typeof notationResultValidator>;
