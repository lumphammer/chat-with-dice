import type { Protagonist } from "#/capabilities/englisheerie/common";

/** The set lines of a Features or Fears trio, as one comma-separated string. */
function joinSetLines(lines: string[]): string {
  return lines.filter((line) => line.trim() !== "").join(", ");
}

const ProseLine = ({ label, value }: { label: string; value: string }) =>
  value === "" ? null : (
    <p>
      <span className="muted">{label}:</span> {value}
    </p>
  );

/**
 * The Protagonist as a few lines of prose rather than a stack of fields — it is
 * written once at the start of a story and read for the rest of it. Everything
 * is optional and every line drops out when it has nothing to say, so a
 * half-filled sheet reads as a half-filled sheet rather than a form with gaps.
 */
export const ProtagonistSummary = ({
  protagonist,
}: {
  protagonist: Protagonist;
}) => {
  const { name, occupation, background } = protagonist;
  const features = joinSetLines(protagonist.features);
  const fears = joinSetLines(protagonist.fears);

  if (
    name === "" &&
    occupation === "" &&
    background === "" &&
    features === "" &&
    fears === ""
  ) {
    return <p className="muted mt-1 text-sm italic">No details yet.</p>;
  }

  return (
    <div className="mt-1 flex flex-col gap-1 text-sm">
      {(name !== "" || occupation !== "") && (
        <p>
          <strong>{name}</strong>
          {occupation !== "" && (
            <span className="muted">
              {name !== "" && " "}({occupation})
            </span>
          )}
        </p>
      )}
      {background !== "" && <p>{background}</p>}
      <ProseLine label="Features" value={features} />
      <ProseLine label="Fears" value={fears} />
    </div>
  );
};
