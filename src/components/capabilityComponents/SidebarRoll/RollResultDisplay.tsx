import {
  messageDataValidator,
  type FavouredHandfuls,
  type Favour,
  type Handful,
  type Keep,
  type Operator,
} from "#/capabilities/rollCapability";
import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { memo } from "react";
import { HandfulDisplay } from "./HandfulDisplay";

type RollResultDisplayProps = {
  results: JsonData;
  messageId: string;
};

function isFavouredHandfuls(
  faces: Handful | FavouredHandfuls,
): faces is FavouredHandfuls {
  return "series1" in faces;
}

function formatFormula(formula: {
  arity: number;
  cardinality: number;
  modifier?: { operator: Operator; operand: number };
  favour: Favour;
  keep: Keep;
  exploding: boolean;
}): string {
  const { arity, cardinality, modifier, favour, keep, exploding } = formula;
  let label = `${arity}d${cardinality}`;

  if (modifier && modifier.operand !== 0) {
    label += ` ${modifier.operator}${modifier.operand}`;
  }

  const extras: string[] = [];
  const keepLabels: Record<string, string> = {
    highest: "keep highest",
    lowest: "keep lowest",
    dropHighest: "drop highest",
    dropLowest: "drop lowest",
  };
  if (keep !== "all") {
    extras.push(keepLabels[keep] ?? keep);
  }
  if (favour !== "normal") {
    extras.push(favour);
  }
  if (exploding) {
    extras.push("exploding");
  }

  if (extras.length > 0) {
    label += ` (${extras.join(", ")})`;
  }

  return label;
}

export const RollResultDisplay = memo(
  ({ results }: RollResultDisplayProps) => {
    const parsed = messageDataValidator.safeParse(results);
    if (!parsed.success) return null;

    const { formula, result } = parsed.data;

    return (
      <div className="flex flex-col gap-1 py-1">
        <span className="font-mono text-xs opacity-60">
          {formatFormula(formula)}
        </span>

        {isFavouredHandfuls(result.faces) ? (
          <div className="flex flex-col gap-1.5">
            <HandfulDisplay
              handful={result.faces.series1}
              dimmed={!result.faces.series1.kept}
              showSubtotal
            />
            <HandfulDisplay
              handful={result.faces.series2}
              dimmed={!result.faces.series2.kept}
              showSubtotal
            />
          </div>
        ) : (
          <HandfulDisplay handful={result.faces} />
        )}

        <div className="flex items-baseline gap-1.5">
          <span className="text-base-content/40 text-xs">total</span>
          <span className="text-xl font-bold tabular-nums">{result.total}</span>
        </div>
      </div>
    );
  },
);

RollResultDisplay.displayName = "RollResultDisplay";
