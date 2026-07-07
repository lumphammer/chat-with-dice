import { FaceChip } from "./FaceChip";

type CompositeFaceChipProps = {
  /** The individual digit rolls of a composite die, e.g. [3, 6] → "36". */
  components: number[];
  /** Drives the data-degree visual styling on each inner chip */
  degree?: "failure" | "success" | "critical";
  /** When true, renders with a strikethrough to indicate the die was dropped */
  dropped?: boolean;
  /** Accessible label for the whole pair; defaults to the joined digits */
  ariaLabel?: string;
};

/**
 * Renders a composite die (d66, d100) as its component digits sitting flush
 * together in a `.dice-face-pair` wrapper, so two chips read as one joined die
 * (e.g. "3""6" → 36). The group carries a single accessible label while the
 * inner chips reuse the standard `.dice-face` degree/dropped styling.
 */
export function CompositeFaceChip({
  components,
  degree,
  dropped = false,
  ariaLabel,
}: CompositeFaceChipProps) {
  return (
    <span
      className="dice-face-pair"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label={ariaLabel ?? components.join("")}
    >
      {components.map((digit, i) => (
        <FaceChip
          key={i}
          value={digit}
          degree={degree}
          dropped={dropped}
          ariaLabel=""
        />
      ))}
    </span>
  );
}
