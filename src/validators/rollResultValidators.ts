import {
  FITD_CRITICAL_DEGREE,
  FITD_FAILURE_DEGREE,
  FITD_SUCCESS_DEGREE,
  HAVOC_CRITICAL_DEGREE,
  HAVOC_FAILURE_DEGREE,
  HAVOC_SUCCESS_DEGREE,
} from "#/constants";
import type { RollType } from "#/types";
import { structuredRollsSchema } from "./rpgDieRollerResulsSchemas";
import { z } from "zod";

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

export type HavocDieFace = z.infer<typeof havocDieFaceSchema>;

export const rollResultValidators = {
  f20: z.object({
    baseRoll: z.int().min(1),
    total: z.int().min(1),
    isCritical: z.boolean(),
    isFumble: z.boolean(),
  }),
  formula: structuredRollsSchema,
  fitd: z.object({
    faces: z.array(
      z.object({
        faceValue: z.int(),
        degree: z.int().min(FITD_FAILURE_DEGREE).max(FITD_SUCCESS_DEGREE),
        isHighest: z.boolean().optional(),
      }),
    ),
    degree: z.int().min(0).max(FITD_CRITICAL_DEGREE),
  }),
  havoc: z.object({
    faces: z.array(havocDieFaceSchema),
  }),
  standard: structuredRollsSchema,
} satisfies Record<RollType, z.ZodTypeAny>;
