import { DIE_CHOICES } from "#/capabilities/roll/common";
import { Fieldset } from "./Fieldset";
import { SegmentedRadioGroup } from "./SegmentedRadioGroup";
import { useId } from "react";

const DIE_SIZE_OPTIONS = DIE_CHOICES.map((choice) => ({
  value: choice.label,
  label: choice.label.slice(1),
  ariaLabel: choice.label,
}));

// Segmented row for all eight die sizes on one line. The leading "d" is shown
// once as a prefix and dropped from each button (4…100) so the row fits the
// sidebar; smaller buttons than the operator row for the same reason.
export const DieSizeToggle = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (label: string) => void;
}) => {
  const name = useId();
  return (
    <Fieldset label="Die Size" className="flex">
      <span className="btn btn-sm btn-ghost mr-2 p-0">d</span>
      <SegmentedRadioGroup
        name={name}
        value={value}
        onChange={onChange}
        className="flex-1"
        options={DIE_SIZE_OPTIONS}
      />
    </Fieldset>
  );
};
