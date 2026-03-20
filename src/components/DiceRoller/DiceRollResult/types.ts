import type {
  ResultGroup,
  RollEntry,
  RollResult,
  RollResults,
  StructuredRolls,
} from "#/validators/rpgDieRollerResulsTypes";

export type ParsedDiceRollResult = {
  rolls: StructuredRolls;
  total: number;
};

export type DiceRollResultProps = {
  formula: string | null;
  result: string | ParsedDiceRollResult | null;
};

export type {
  ResultGroup,
  RollEntry,
  RollResult,
  RollResults,
  StructuredRolls,
};
