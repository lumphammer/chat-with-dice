import type { Favour } from "#/capabilities/roll/common";
import { Fieldset } from "./Fieldset";
import { SegmentedRadioGroup } from "./SegmentedRadioGroup";
import { useId } from "react";

// "Disadvantage" is abbreviated so all three fit on one line.
const FAVOUR_OPTIONS: { value: Favour; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "advantage", label: "Advantage" },
  { value: "disadvantage", label: "Disadv." },
];

// The wrapping <Field> legend names this group, so the row needs no duplicate
// aria-label.
export const FavourToggle = ({
  value,
  onChange,
}: {
  value: Favour;
  onChange: (favour: Favour) => void;
}) => {
  const name = useId();
  return (
    <Fieldset label="Favour">
      <SegmentedRadioGroup
        name={name}
        value={value}
        options={FAVOUR_OPTIONS}
        onChange={onChange}
      />
    </Fieldset>
  );
};
