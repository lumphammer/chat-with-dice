import { CommittedTextField } from "./CommittedTextField";

interface Props {
  legend: string;
  /** The singular, for the individual lines: "Feature 1", "Fear 2". */
  lineLabel: string;
  values: string[];
  onCommit: (index: number, value: string) => void;
}

/**
 * A Features or Fears trio on the setup sheet. Always three lines — they are
 * sheet lines rather than a list, so there is nothing to add or remove.
 */
export const ProtagonistTrioFields = ({
  legend,
  lineLabel,
  values,
  onCommit,
}: Props) => (
  <fieldset className="m-0 min-w-0 border-0 p-0">
    <legend className="muted mb-2 text-xs font-semibold tracking-wide uppercase">
      {legend}
    </legend>
    <div className="flex flex-col gap-2">
      {values.map((value, index) => (
        <CommittedTextField
          key={index}
          label={`${lineLabel} ${index + 1}`}
          value={value}
          onCommit={(committed) => onCommit(index, committed)}
        />
      ))}
    </div>
  </fieldset>
);
