import type { Handful } from "#/capabilities/rollCapability";
import { FaceChip } from "./FaceChip";

type HandfulDisplayProps = {
  handful: Handful;
  /** When true, the whole handful is the losing series in an adv/dis roll */
  dimmed?: boolean;
  /** Show the handful's subtotal alongside the dice */
  showSubtotal?: boolean;
};

export function HandfulDisplay({
  handful,
  dimmed = false,
  showSubtotal = false,
}: HandfulDisplayProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 transition-opacity ${
        dimmed ? "opacity-35" : ""
      }`}
    >
      {handful.faces.map((face, i) => (
        <FaceChip key={i} face={face} />
      ))}
      {showSubtotal && (
        <>
          <span className="text-base-content/30 mx-0.5">=</span>
          <span className="font-semibold tabular-nums">{handful.total}</span>
        </>
      )}
    </div>
  );
}
