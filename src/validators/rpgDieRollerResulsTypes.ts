import type {
  resultGroupSchema,
  rollEntrySchema,
  rollResultSchema,
  rollResultsSchema,
  structuredRollsSchema,
} from "./rpgDieRollerResulsSchemas";
import { z } from "zod/v4";

/**
 * Represents the result of an individual die roll
 */
export type RollResult = z.infer<typeof rollResultSchema>;

/**
 * Represents a group of rolled dice, such as the 3 dice in a `3d6`
 */
export type RollResults = z.infer<typeof rollResultsSchema>;

/**
 * A result-group, produced by roll group notation like {3d8, 3d8}k1.
 * The outer group has isRollGroup: true and contains inner result-groups as children.
 * Inner groups (isRollGroup: false) each represent one sub-expression and carry
 * their own useInTotal / modifierFlags for drop/keep at the group level.
 */
export type ResultGroup = z.infer<typeof resultGroupSchema>;

/**
 * A single element in the top-level rolls array.
 * Regular roll:  [RollResultsGroup, "+", RollResultsGroup, "+", 3]
 * Roll group:    [ResultGroupItem(isRollGroup=true)]
 */
export type RollEntry = z.infer<typeof rollEntrySchema>;

export type StructuredRolls = z.infer<typeof structuredRollsSchema>;
