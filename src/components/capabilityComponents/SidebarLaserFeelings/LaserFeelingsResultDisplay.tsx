import {
  messageDataValidator,
  type Face,
  type Formula,
} from "#/capabilities/laserFeelingsCapability";
import { DiceRow } from "#/components/capabilityComponents/shared/diceDisplay/DiceRow";
import { FaceChip } from "#/components/capabilityComponents/shared/diceDisplay/FaceChip";
import { FormulaLine } from "#/components/capabilityComponents/shared/diceDisplay/FormulaLine";
import { ResultStat } from "#/components/capabilityComponents/shared/diceDisplay/ResultStat";
import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { Sparkles } from "lucide-react";
import { memo } from "react";

function formatFormula(formula: Formula): string {
  return `${formula.numberOfDice}d6 ${formula.mode}, your number: ${formula.yourNumber}`;
}

function getFaceDegree(face: Face): "failure" | "success" | "critical" {
  if (face.laserFeelings) return "critical";
  if (face.success) return "success";
  return "failure";
}

function getFaceAriaLabel(face: Face): string {
  if (face.laserFeelings) return `${face.result} (laser feelings)`;
  if (face.success) return `${face.result} (success)`;
  return `${face.result} (miss)`;
}

export const LaserFeelingsResultDisplay = memo(
  ({ results }: { results?: JsonData; messageId: string }) => {
    const parsed = messageDataValidator.safeParse(results);
    if (!parsed.success) return null;

    const { formula, result } = parsed.data;
    const { faces, successCount, laserFeelingsCount } = result;

    const successLabel = successCount === 1 ? "success" : "successes";
    const laserFeelingsMessage =
      laserFeelingsCount === 1
        ? "LASER FEELINGS! Ask the GM a question."
        : `LASER FEELINGS! Ask the GM ${laserFeelingsCount} questions.`;

    return (
      <div className="flex flex-col gap-1 py-1">
        <FormulaLine>{formatFormula(formula)}</FormulaLine>

        <DiceRow>
          {faces.map((face, i) => (
            <FaceChip
              key={i}
              value={face.result}
              degree={getFaceDegree(face)}
              ariaLabel={getFaceAriaLabel(face)}
            />
          ))}
        </DiceRow>

        <ResultStat label={successLabel} value={successCount} />

        {laserFeelingsCount > 0 && (
          <div
            className="bg-info/10 border-info/30 text-info mt-1 flex
              items-center gap-2 rounded border p-2 text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{laserFeelingsMessage}</span>
          </div>
        )}
      </div>
    );
  },
);

LaserFeelingsResultDisplay.displayName = "LaserFeelingsResultDisplay";
