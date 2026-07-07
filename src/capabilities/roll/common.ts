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

// A "standard" die is a plain 1..cardinality draw. "d66" and "d100" are
// composite dice: two smaller dice read as tens + units digits. `.default`
// keeps roll messages stored before d66/d100 existed parsing.
const dieTypeValidator = z
  .enum(["standard", "d66", "d100"])
  .default("standard");

export type DieType = z.infer<typeof dieTypeValidator>;

const rollFormulaValidator = z.object({
  arity: z.int().min(1),
  cardinality: z.int().min(1),
  dieType: dieTypeValidator,
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

export type RollFormula = z.infer<typeof rollFormulaValidator>;

// The die sizes offered in the roll form. `cardinality` doubles as each die's
// max value (66, 100), so `result === cardinality` still detects the max roll
// for success-highlighting and explosions across standard and composite dice.
export const DIE_CHOICES = [
  { label: "d4", dieType: "standard", cardinality: 4 },
  { label: "d6", dieType: "standard", cardinality: 6 },
  { label: "d8", dieType: "standard", cardinality: 8 },
  { label: "d10", dieType: "standard", cardinality: 10 },
  { label: "d12", dieType: "standard", cardinality: 12 },
  { label: "d20", dieType: "standard", cardinality: 20 },
  { label: "d66", dieType: "d66", cardinality: 66 },
  { label: "d100", dieType: "d100", cardinality: 100 },
] as const satisfies { label: string; dieType: DieType; cardinality: number }[];

const faceValidator = z.object({
  cardinality: z.int().min(1),
  result: z.int().min(1),
  // The individual digit rolls for composite dice (e.g. [3, 6] → 36). Absent
  // for standard dice; digits can be 0 for d100. Optional so pre-existing
  // stored faces still validate.
  components: z.array(z.int().min(0)).optional(),
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
