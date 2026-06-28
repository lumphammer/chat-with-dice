import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

// TERMINOLOGY
// FACE: a die that has landed on the table and is showing a number
// HANDFUL: a group of dice thrown together
// FAVOUR: Advantage or disadvantage

const keepValidator = z
  .enum(["all", "highest", "lowest", "dropHighest", "dropLowest"])
  .default("all");

export type Keep = z.infer<typeof keepValidator>;

const favourValidator = z.enum(["normal", "advantage", "disadvantage"]);

const operatorValidator = z.enum(["+", "-", "*", "/"]);

export type Operator = z.infer<typeof operatorValidator>;

export type Favour = z.infer<typeof favourValidator>;

const rollFormulaValidator = z.object({
  arity: z.int().min(1),
  cardinality: z.int().min(1),
  modifier: z
    .object({
      operator: operatorValidator,
      operand: z.number(),
    })
    .optional(),
  favour: favourValidator,
  keep: keepValidator,
  exploding: z.boolean(),
});

const faceValidator = z.object({
  cardinality: z.int().min(1),
  result: z.int().min(1),
  exploded: z.boolean(),
  kept: z.boolean(),
});

export type Face = z.infer<typeof faceValidator>;

const handfulValidator = z.object({
  faces: z.array(faceValidator),
  total: z.int(),
  kept: z.boolean(),
});

export type Handful = z.infer<typeof handfulValidator>;

const favouredHandfulsValidator = z.object({
  series1: handfulValidator,
  series2: handfulValidator,
  total: z.int(),
});

export type FavouredHandfuls = z.infer<typeof favouredHandfulsValidator>;

export const messageDataValidator = z.object({
  formula: rollFormulaValidator,
  result: z.object({
    faces: z.union([handfulValidator, favouredHandfulsValidator]),
    total: z.int(),
  }),
});

export const rollCommon = createCapabilityCommon({
  name: "roll",
  displayName: "Roll",
  visibility: "public",
  messageDataValidator,
  buildActions: ({ createAction }) => ({
    doRoll: createAction({
      payloadValidator: rollFormulaValidator,
    }),
  }),
});
