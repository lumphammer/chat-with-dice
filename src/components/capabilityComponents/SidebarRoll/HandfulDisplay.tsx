import type { Face, Handful } from "#/capabilities/rollCapability";
import { DiceRow } from "#/components/capabilityComponents/shared/diceDisplay/DiceRow";
import { FaceChip } from "#/components/capabilityComponents/shared/diceDisplay/FaceChip";

type HandfulDisplayProps = {
  handful: Handful;
  /** When true, the whole handful is the losing series in an adv/dis roll */
  dimmed?: boolean;
  /** Show the handful's subtotal alongside the dice */
  showSubtotal?: boolean;
};

function getRollFaceDegree(
  face: Face,
): "failure" | "success" | "critical" | undefined {
  if (!face.kept) return "failure";
  if (face.exploded) return "critical";
  if (face.result === face.cardinality) return "success";
  return undefined;
}

function getRollFaceAriaLabel(face: Face): string {
  return `${face.result}${!face.kept ? " (dropped)" : ""}${
    face.exploded ? " (exploded)" : ""
  }`;
}

export function HandfulDisplay({
  handful,
  dimmed = false,
  showSubtotal = false,
}: HandfulDisplayProps) {
  return (
    <DiceRow dimmed={dimmed}>
      {handful.faces.map((face, i) => (
        <FaceChip
          key={i}
          value={face.result}
          degree={getRollFaceDegree(face)}
          dropped={!face.kept}
          ariaLabel={getRollFaceAriaLabel(face)}
        />
      ))}
      {showSubtotal && (
        <>
          <span className="text-base-content/30 mx-0.5">=</span>
          <span className="font-semibold tabular-nums">{handful.total}</span>
        </>
      )}
    </DiceRow>
  );
}
