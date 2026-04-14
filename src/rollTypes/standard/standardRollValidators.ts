import { structuredRollsSchema } from "#/validators/rpgDieRollerResulsSchemas";
import { z } from "zod";

export const standardFormulaValidator = z.object({ formula: z.string() });

export type StandardFormula = z.infer<typeof standardFormulaValidator>;

export const standardResultValidator = z.object({
  rolls: structuredRollsSchema,
  total: z.int(),
});

export type StandardResult = z.infer<typeof standardResultValidator>;
