import faceStyles from "#/styles/faces.module.css";

type FaceChipProps = {
  value: number | string;
  /** Drives the data-degree visual styling in faces.module.css */
  degree?: "failure" | "success" | "critical";
  /** When true, renders with a strikethrough to indicate the die was dropped */
  dropped?: boolean;
  /** Accessible label; defaults to String(value) */
  ariaLabel?: string;
};

export function FaceChip({
  value,
  degree,
  dropped = false,
  ariaLabel,
}: FaceChipProps) {
  return (
    <span
      className={`${faceStyles.face}
        ${dropped ? "line-through decoration-2" : ""}`}
      data-degree={degree}
      aria-label={ariaLabel ?? String(value)}
    >
      {value}
    </span>
  );
}
