import type { Operator } from "#/capabilities/roll/common";
import { SegmentedRadioGroup } from "./SegmentedRadioGroup";
import { OPERATOR_GLYPHS } from "./operatorGlyphs";
import { useId } from "react";

type OperatorToggleProps = {
  value: Operator;
  onChange: (operator: Operator) => void;
};

const OPERATOR_OPTIONS: readonly Operator[] = ["+", "-", "*", "/"];
const OPERATOR_SEGMENT_OPTIONS = OPERATOR_OPTIONS.map((operator) => ({
  value: operator,
  label: OPERATOR_GLYPHS[operator],
  ariaLabel: `Operator ${operator}`,
}));

// Segmented +/−/×/÷ instead of a native <select>. A nested sub-group of the
// Modifier field, so it keeps its own aria-label to distinguish it from the
// operand input alongside.
export const OperatorToggle = ({ value, onChange }: OperatorToggleProps) => {
  const name = useId();
  return (
    <SegmentedRadioGroup
      name={name}
      value={value}
      onChange={onChange}
      ariaLabel="Operator"
      className="join min-w-0"
      optionClassName="btn join-item flex-1 text-2xl leading-none"
      options={OPERATOR_SEGMENT_OPTIONS}
    />
  );
};
