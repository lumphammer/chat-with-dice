import {
  HAVOC_CRITICAL_DEGREE,
  HAVOC_FAILURE_DEGREE,
  HAVOC_SUCCESS_DEGREE,
} from "#/constants";
import { z } from "zod";

export type HavocFormula = z.infer<typeof havocFormulaValidator>;
export type HavocResult = z.infer<typeof havocResultValidator>;
export type HavocFace = z.infer<typeof havocDieFaceSchema>;

export const havocFormulaValidator = z.object({
  numDice: z.int().min(1),
});

const havocAllocationSchema = z.object({
  type: z.enum(["threat", "objective"]),
  id: z.string(),
});

const havocDieFaceSchema = z.union([
  z.object({
    faceValue: z.int(),
    degree: z.literal(HAVOC_FAILURE_DEGREE),
  }),
  z.object({
    faceValue: z.int(),
    degree: z.literal(HAVOC_SUCCESS_DEGREE),
    allocation: havocAllocationSchema.optional(),
  }),
  z.object({
    faceValue: z.int(),
    degree: z.literal(HAVOC_CRITICAL_DEGREE),
    usedForSpecial: z.literal(false),
    allocation: havocAllocationSchema.optional(),
    criticalAllocation: havocAllocationSchema.optional(),
  }),
  z.object({
    faceValue: z.int(),
    degree: z.literal(HAVOC_CRITICAL_DEGREE),
    usedForSpecial: z.literal(true),
  }),
]);

export const havocResultValidator = z.object({
  faces: z.array(havocDieFaceSchema),
});
