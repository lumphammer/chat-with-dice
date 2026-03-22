import type {
  StandardFormula,
  StandardResult,
} from "#/rollTypes/standard/standardRollValidators";
import { RollEntryNode } from "./RollEntryNode";
import { isPoolRoll } from "./isPoolRoll";
import { memo } from "react";

export type DiceRollResultProps = {
  formula: StandardFormula;
  result: StandardResult;
};

export const DiceRollResult = memo(
  ({ formula, result }: DiceRollResultProps) => {
    const pool = isPoolRoll(result.rolls);

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-sm opacity-70">{formula}</span>
        <span className="opacity-30">→</span>
        {result.rolls.map((entry, i) => (
          <RollEntryNode key={i} entry={entry} />
        ))}
        <span className="opacity-30">=</span>
        <span className="text-lg font-bold tabular-nums">{result.total}</span>
        {pool && (
          <span className="text-sm opacity-50">
            {result.total === 1 ? "success" : "successes"}
          </span>
        )}
      </div>
    );
  },
);

DiceRollResult.displayName = "DiceRollResult";
