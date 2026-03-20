import { standardRollType } from "./standard/standardRollType";

export const rollTypeRegistry = {
  standard: standardRollType,
  // f20: defineRoll({
  //   requestValidator: z.object({
  //     critOn: z.int().min(1),
  //     fumbleOn: z.int().min(1),
  //     modifier: z.int().default(0),
  //     advantageOrDisadvanatage: z
  //       .enum(["advantage", "disadvantage"])
  //       .optional(),
  //     target: z.int().min(1).optional(),
  //   }),
  //   resultValidator: z.object({
  //     baseRoll: z.int().min(1),
  //     total: z.int().min(1),
  //     isCritical: z.boolean(),
  //     isFumble: z.boolean(),
  //   }),
  //   inputUI: ({ onChange: _onSubmit }) => null,
  //   resultDisplay: () => "f20 roll",
  //   handler: (_req) => ({
  //     baseRoll: 20,
  //     isCritical: false,
  //     isFumble: false,
  //     total: 20,
  //   }),
  // }),
  // formula: defineRoll({
  //   requestValidator: z.string(),
  //   resultValidator: z.object({ rolls: structuredRollsSchema, total: z.int() }),
  //   resultDisplay: DiceRollResult,
  // }),
  // havoc: defineRoll({}),
  // fitd: defineRoll({}),
};
