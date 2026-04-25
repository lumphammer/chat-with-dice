import {
  messageDataValidator,
  type FavouredHandfuls,
  type Favour,
  type Handful,
  type Keep,
  type Operator,
} from "#/capabilities/rollCapability";
import { FormulaLine } from "#/components/capabilityComponents/shared/diceDisplay/FormulaLine";
import { ResultStat } from "#/components/capabilityComponents/shared/diceDisplay/ResultStat";
import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { HandfulDisplay } from "./HandfulDisplay";
import { memo } from "react";

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
  ({ results }: { results?: JsonData; messageId: string }) => {
    const parsed = messageDataValidator.safeParse(results);
    if (!parsed.success) return null;

    const { formula, result } = parsed.data;

    return (
      <div className="flex flex-col gap-1 py-1">
        <FormulaLine>{formatFormula(formula)}</FormulaLine>

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

        <ResultStat label="total" value={result.total} />
      </div>
    );
  },
);

RollResultDisplay.displayName = "RollResultDisplay";
