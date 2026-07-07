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
      className={"dice-face"}
      data-degree={degree}
      data-dropped={dropped ? "true" : undefined}
      aria-label={ariaLabel ?? String(value)}
    >
      {value}
    </span>
  );
}
