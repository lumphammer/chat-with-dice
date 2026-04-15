import faceStyles from "#/styles/faces.module.css";
import type { Face } from "#/capabilities/rollCapability";

type FaceChipProps = {
  face: Face;
};

export function FaceChip({ face }: FaceChipProps) {
  let degree: "failure" | "success" | "critical" | undefined;

  if (!face.kept) {
    degree = "failure";
  } else if (face.exploded) {
    degree = "critical";
  } else if (face.result === face.cardinality) {
    degree = "success";
  }

  return (
    <span
      className={`${faceStyles.face} ${!face.kept ? "line-through decoration-2" : ""}`}
      data-degree={degree}
      aria-label={`${face.result}${!face.kept ? " (dropped)" : ""}${face.exploded ? " (exploded)" : ""}`}
    >
      {face.result}
    </span>
  );
}
