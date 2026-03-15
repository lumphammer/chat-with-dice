import { z } from "zod/v4";

export const rollResultSchema = z.object({
  type: z.literal("result"),
  value: z.number(),
  initialValue: z.number(),
  calculationValue: z.number(),
  // e.g. "", "d", "!", "r", "*", "_"
  modifierFlags: z.string(),
  // e.g. [], ["drop"], ["explode"], ["critical-success"], ["target-success"], ["target-failure"]
  modifiers: z.array(z.string()),
  useInTotal: z.boolean(),
});

/**
 * Represents a group of rolled dice, such as the 3 dice in a `3d6`
 */
export const rollResultsSchema = z.object({
  type: z.literal("roll-results"),
  rolls: z.array(rollResultSchema),
  value: z.number(),
});

export const resultGroupSchema = z.object({
  type: z.literal("result-group"),
  isRollGroup: z.boolean(),
  modifierFlags: z.string(),
  modifiers: z.array(z.string()),
  useInTotal: z.boolean(),
  calculationValue: z.number(),
  value: z.number(),
  // getter allows this to be recursive
  get results() {
    return z.array(
      z.union([rollResultsSchema, resultGroupSchema, z.string(), z.number()]),
    );
  },
});

export const rollEntrySchema = z.union([
  rollResultsSchema,
  resultGroupSchema,
  z.string(),
  z.number(),
]);

export const structuredRollsSchema = z.array(rollEntrySchema);
