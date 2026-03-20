import { rollFormulaValidators } from "#/validators/rollFormulaValidators";
import { rollResultValidators } from "#/validators/rollResultValidators";
import { RollEntryNode } from "./RollEntryNode";
import { isPoolRoll } from "./isPoolRoll";
import type { DiceRollResultProps, StructuredRolls } from "./types";
import { memo } from "react";

export const DiceRollResult = memo(
  ({ formula: rawFormula, result: rawResult }: DiceRollResultProps) => {
    const { data: formula } =
      rollFormulaValidators["formula"].safeParse(rawFormula);
    if (!formula) return null;

    let structured: StructuredRolls | null = null;
    let total = 0;

    if (typeof rawResult === "string") {
      const { data: parsedResult } =
        rollResultValidators["formula"].safeParse(rawResult);
      structured = parsedResult?.rolls ?? null;
      total = parsedResult?.total ?? 0;
    } else if (rawResult) {
      const { data: parsedResult } =
        rollResultValidators["formula"].safeParse(rawResult);
      structured = parsedResult?.rolls ?? null;
      total = parsedResult?.total ?? 0;
    }

    if (!structured) {
      return (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1">
          <span className="font-mono text-sm opacity-50">{formula}</span>
          <span className="opacity-30">=</span>
          <span className="text-lg font-bold tabular-nums">{total}</span>
        </div>
      );
    }

    const pool = isPoolRoll(structured);

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
        <span className="font-mono text-sm opacity-70">{formula}</span>
        <span className="opacity-30">→</span>
        {structured.map((entry, i) => (
          <RollEntryNode key={i} entry={entry} />
        ))}
        <span className="opacity-30">=</span>
        <span className="text-lg font-bold tabular-nums">{total}</span>
        {pool && (
          <span className="text-sm opacity-50">
            {total === 1 ? "success" : "successes"}
          </span>
        )}
      </div>
    );
  },
);

DiceRollResult.displayName = "DiceRollResult";
