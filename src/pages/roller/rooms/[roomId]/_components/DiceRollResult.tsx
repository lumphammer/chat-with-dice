import {
  type ResultGroup,
  type RollEntry,
  type RollResult,
  type RollResults,
  type StructuredRolls,
  structuredRollsSchema,
} from "../../../../../workers/types";
import { memo } from "react";

type DiceRollResultProps = {
  formula: string | null;
  rolls: string | null;
  total: number | null;
};

function parseRolls(rolls: string): StructuredRolls | null {
  try {
    return structuredRollsSchema.parse(JSON.parse(rolls));
  } catch {
    return null;
  }
}

function isDicePool(group: RollResults): boolean {
  return group.rolls.some(
    (r) =>
      r.modifiers.includes("target-success") ||
      r.modifiers.includes("target-failure"),
  );
}

function DieChip({
  die,
  dicePool = false,
}: {
  die: RollResult;
  dicePool?: boolean;
}) {
  const isDropped = !die.useInTotal;
  const isExploded = die.modifiers.includes("explode");
  const isCritSuccess = die.modifiers.includes("critical-success");
  const isCritFail = die.modifiers.includes("critical-failure");
  const isRerolled = die.modifiers.includes("re-roll");
  const isSuccess = die.modifiers.includes("target-success");
  const isFailure = die.modifiers.includes("target-failure");
  const isPoolCrit = isSuccess && isCritSuccess;
  const isMiss =
    dicePool && !isSuccess && !isFailure && !isDropped && !isCritFail;

  let extraClasses = "";
  if (isDropped) {
    extraClasses = "opacity-50 line-through decoration-2";
  } else if (isPoolCrit) {
    // success AND crit — stands out from plain success
    extraClasses = "text-success font-bold ring-2 ring-success";
  } else if (isSuccess) {
    extraClasses = "text-success ring-2 ring-success/50";
  } else if (isFailure) {
    extraClasses = "text-error ring-2 ring-error/50";
  } else if (isCritSuccess) {
    extraClasses = "text-success ring-2 ring-success/50";
  } else if (isCritFail) {
    extraClasses = "text-error ring-2 ring-error/50";
  } else if (isExploded) {
    extraClasses = "text-warning ring-2 ring-warning/50";
  } else if (isRerolled) {
    extraClasses = "opacity-50 line-through";
  } else if (isMiss) {
    extraClasses = "opacity-50";
  }

  return (
    <kbd className={`kbd kbd-sm tabular-nums ${extraClasses}`}>
      {die.value}
      {isExploded && <span className="text-warning ml-px">!</span>}
      {isPoolCrit && <span className="text-success ml-px">**</span>}
      {!isPoolCrit && isSuccess && (
        <span className="text-success ml-px">*</span>
      )}
      {isFailure && <span className="text-error ml-px">_</span>}
      {isCritFail && !isFailure && <span className="text-error ml-px">__</span>}
    </kbd>
  );
}

function RollGroup({ group }: { group: RollResults }) {
  const pool = isDicePool(group);
  return (
    <div className="flex flex-wrap gap-1">
      {group.rolls.map((die, i) => (
        <DieChip key={i} die={die} dicePool={pool} />
      ))}
    </div>
  );
}

function SubExpression({ group }: { group: ResultGroup }) {
  const isDropped = !group.useInTotal;
  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-lg border px-2 py-1
        ${isDropped ? "border-base-300 opacity-35" : "border-base-content/20"}`}
    >
      {group.results.map((entry, i) => (
        <RollEntryNode key={i} entry={entry} />
      ))}
      <span
        className={`ml-1 text-sm font-semibold tabular-nums
          ${isDropped ? "line-through" : "opacity-70"}`}
      >
        ={group.value}
      </span>
    </div>
  );
}

function RollGroupContainer({ group }: { group: ResultGroup }) {
  return (
    <div className="flex flex-wrap gap-2">
      {group.results.map((entry, i) => {
        if (typeof entry === "object" && entry.type === "result-group") {
          return <SubExpression key={i} group={entry} />;
        }
        return null;
      })}
    </div>
  );
}

function RollEntryNode({ entry }: { entry: RollEntry }) {
  if (typeof entry === "string") {
    // operator: +, -, *, /
    return <span className="self-center opacity-40">{entry}</span>;
  }
  if (typeof entry === "number") {
    // literal modifier, e.g. the +3 in "2d6+3"
    return (
      <span className="self-center font-mono text-sm opacity-60">{entry}</span>
    );
  }
  if (entry.type === "roll-results") {
    return <RollGroup group={entry} />;
  }
  if (entry.type === "result-group" && entry.isRollGroup) {
    return <RollGroupContainer group={entry} />;
  }
  return null;
}

function isPoolRoll(structured: StructuredRolls): boolean {
  for (const entry of structured) {
    if (typeof entry === "object" && entry.type === "roll-results") {
      if (isDicePool(entry)) return true;
    }
  }
  return false;
}

export const DiceRollResult = memo(
  ({ formula, rolls, total }: DiceRollResultProps) => {
    if (!formula || total === null) return null;

    const structured = rolls ? parseRolls(rolls) : null;

    // Fall back to just showing formula = total if we can't parse rolls
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
