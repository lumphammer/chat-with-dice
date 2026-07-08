import type { Favour } from "#/capabilities/roll/common";
import { SegmentedRadioGroup } from "./SegmentedRadioGroup";
import { useId } from "react";

type FavourToggleProps = {
  value: Favour;
  onChange: (favour: Favour) => void;
};

// "Disadvantage" is abbreviated so all three fit on one line.
const FAVOUR_OPTIONS: { value: Favour; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "advantage", label: "Advantage" },
  { value: "disadvantage", label: "Disadv." },
];

// The wrapping <Field> legend names this group, so the row needs no duplicate
// aria-label.
export const FavourToggle = ({ value, onChange }: FavourToggleProps) => {
  const name = useId();
  return (
    <SegmentedRadioGroup
      name={name}
      value={value}
      options={FAVOUR_OPTIONS}
      onChange={onChange}
    />
  );
};
