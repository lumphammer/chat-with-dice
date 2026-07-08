import { DIE_CHOICES } from "#/capabilities/roll/common";
import { SegmentedRadioGroup } from "./SegmentedRadioGroup";
import { useId } from "react";

type DieSizeToggleProps = {
  value: string;
  onChange: (label: string) => void;
};

const DIE_SIZE_OPTIONS = DIE_CHOICES.map((choice) => ({
  value: choice.label,
  label: choice.label.slice(1),
  ariaLabel: choice.label,
}));

// Segmented row for all eight die sizes on one line. The leading "d" is shown
// once as a prefix and dropped from each button (4…100) so the row fits the
// sidebar; smaller buttons than the operator row for the same reason.
export const DieSizeToggle = ({ value, onChange }: DieSizeToggleProps) => {
  const name = useId();
  return (
    <div className="flex items-center gap-2">
      <span className="text-base-content/40 font-mono text-lg font-bold">
        d
      </span>
      <SegmentedRadioGroup
        name={name}
        value={value}
        onChange={onChange}
        className="join min-w-0 flex-1"
        optionClassName="btn btn-sm join-item min-w-0 flex-1 px-1 text-sm"
        options={DIE_SIZE_OPTIONS}
      />
    </div>
  );
};
