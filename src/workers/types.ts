import { ROLL_TYPES } from "#/constants";
import { Messages } from "../schemas/roller-schema";
import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

const USERNAME_MAX_LENGTH = 128;

// Structured types for the `rolls` JSON column, matching the shape of
// DiceRoll.toJSON().rolls from @dice-roller/rpg-dice-roller

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
 * Represents the result of an individual die roll
 */
export type RollResult = z.infer<typeof rollResultSchema>;

/**
 * Represents a group of rolled dice, such as the 3 dice in a `3d6`
 */
export const rollResultsSchema = z.object({
  type: z.literal("roll-results"),
  rolls: z.array(rollResultSchema),
  value: z.number(),
});

/**
 * Represents a group of rolled dice, such as the 3 dice in a `3d6`
 */
export type RollResults = z.infer<typeof rollResultsSchema>;

export const resultGroupSchema: z.ZodSchema<ResultGroup> = z.lazy(() =>
  z.object({
    type: z.literal("result-group"),
    isRollGroup: z.boolean(),
    modifierFlags: z.string(),
    modifiers: z.array(z.string()),
    useInTotal: z.boolean(),
    calculationValue: z.number(),
    value: z.number(),
    results: z.array(
      z.union([rollResultsSchema, resultGroupSchema, z.string(), z.number()]),
    ),
  }),
);

/**
 * A result-group, produced by roll group notation like {3d8, 3d8}k1.
 * The outer group has isRollGroup: true and contains inner result-groups as children.
 * Inner groups (isRollGroup: false) each represent one sub-expression and carry
 * their own useInTotal / modifierFlags for drop/keep at the group level.
 */
export type ResultGroup = {
  // note we have to define this by hand rather than using z.infer to break a
  // circular dependency.
  type: "result-group";
  isRollGroup: boolean;
  modifierFlags: string;
  modifiers: string[];
  useInTotal: boolean;
  calculationValue: number;
  value: number;
  results: Array<RollResults | ResultGroup | string | number>;
};

export const rollEntrySchema = z.union([
  rollResultsSchema,
  resultGroupSchema,
  z.string(),
  z.number(),
]);

/**
 * A single element in the top-level rolls array.
 * Regular roll:  [RollResultsGroup, "+", RollResultsGroup, "+", 3]
 * Roll group:    [ResultGroupItem(isRollGroup=true)]
 */
export type RollEntry = z.infer<typeof rollEntrySchema>;

export const structuredRollsSchema = z.array(rollEntrySchema);

export type StructuredRolls = z.infer<typeof structuredRollsSchema>;

export const sessionAttachmentSchema = z.object({
  chatId: z.uuid(),
});

export type SessionAttachment = z.infer<typeof sessionAttachmentSchema>;

export const rollerMessageSchema = createSelectSchema(Messages);

export type RollerMessage = z.infer<typeof rollerMessageSchema>;

export const webSocketServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    payload: z.object({ message: rollerMessageSchema }),
  }),
  z.object({
    type: z.literal("catchup"),
    payload: z.object({ messages: z.array(rollerMessageSchema) }),
  }),
  z.object({
    type: z.literal("error"),
    payload: z.object({ errorMessage: z.string(), detail: z.string() }),
  }),
]);

export type WebSocketServerMessage = z.infer<
  typeof webSocketServerMessageSchema
>;

export const webSocketClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat"),
    payload: z.object({
      rollType: z.enum(ROLL_TYPES),
      rollTypeVersion: z.int().min(1),
      formula: z.string().nullable(),
      chat: z.string().nullable(),
      displayName: z.string().min(1).max(USERNAME_MAX_LENGTH),
    }),
  }),
]);

export type WebSocketClientMessage = z.infer<
  typeof webSocketClientMessageSchema
>;
