import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

// TERMINOLOGY
// FACE: a die that has landed on the table and is showing a number
// MODE: which trigger button was pressed — "lasers" (succeed below your
//   number) or "feelings" (succeed above your number)
// LASER FEELINGS: a die landing exactly on the player's number — counts as
//   a success and grants the right to ask the GM a question

const D6 = 6;
const YOUR_NUMBER_MIN = 2;
const YOUR_NUMBER_MAX = 5;
const NUMBER_OF_DICE_MIN = 1;
const NUMBER_OF_DICE_MAX = 4;

const yourNumberValidator = z.int().min(YOUR_NUMBER_MIN).max(YOUR_NUMBER_MAX);

export type YourNumber = z.infer<typeof yourNumberValidator>;

const numberOfDiceValidator = z
  .int()
  .min(NUMBER_OF_DICE_MIN)
  .max(NUMBER_OF_DICE_MAX);

export type NumberOfDice = z.infer<typeof numberOfDiceValidator>;

function inclusiveRange(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = min; i <= max; i++) out.push(i);
  return out;
}

export const YOUR_NUMBER_OPTIONS: YourNumber[] = inclusiveRange(
  YOUR_NUMBER_MIN,
  YOUR_NUMBER_MAX,
);

export const NUMBER_OF_DICE_OPTIONS: NumberOfDice[] = inclusiveRange(
  NUMBER_OF_DICE_MIN,
  NUMBER_OF_DICE_MAX,
);

const DEFAULT_YOUR_NUMBER_VALUE = 4;
const DEFAULT_NUMBER_OF_DICE_VALUE = 2;

export const DEFAULT_YOUR_NUMBER: YourNumber = DEFAULT_YOUR_NUMBER_VALUE;
export const DEFAULT_NUMBER_OF_DICE: NumberOfDice =
  DEFAULT_NUMBER_OF_DICE_VALUE;

const modeValidator = z.enum(["lasers", "feelings"]);

export type Mode = z.infer<typeof modeValidator>;

const formulaValidator = z.object({
  yourNumber: yourNumberValidator,
  numberOfDice: numberOfDiceValidator,
  mode: modeValidator,
});

export type Formula = z.infer<typeof formulaValidator>;

const faceValidator = z.object({
  result: z.int().min(1).max(D6),
  success: z.boolean(),
  laserFeelings: z.boolean(),
});

export type Face = z.infer<typeof faceValidator>;

export const messageDataValidator = z.object({
  formula: formulaValidator,
  result: z.object({
    faces: z.array(faceValidator),
    successCount: z.int().min(0),
    laserFeelingsCount: z.int().min(0),
  }),
});

export const D6_FACES = D6;

export const laserfeelingsCommon = createCapabilityCommon({
  name: "laserfeelings",
  displayName: "Lasers & Feelings",
  visibility: "public",
  messageDataValidator,
  buildActions: ({ createAction }) => ({
    doRoll: createAction({
      payloadValidator: formulaValidator,
    }),
  }),
});
