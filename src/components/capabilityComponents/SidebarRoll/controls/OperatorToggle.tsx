import type { Operator } from "#/capabilities/roll/common";
import { OPERATOR_GLYPHS } from "./operatorGlyphs";

type OperatorToggleProps = {
  value: Operator;
  onChange: (operator: Operator) => void;
};

const OPERATOR_OPTIONS: readonly Operator[] = ["+", "-", "*", "/"];

// Segmented +/−/×/÷ instead of a native <select>.
export const OperatorToggle = ({ value, onChange }: OperatorToggleProps) => (
  <fieldset
    className="join m-0 min-w-0 border-0 p-0"
    aria-label="Modifier operator"
  >
    {OPERATOR_OPTIONS.map((operator) => (
      <button
        key={operator}
        type="button"
        onClick={() => onChange(operator)}
        className={`btn join-item flex-1 text-2xl leading-none ${
          operator === value ? "btn-primary" : "btn-neutral"
        }`}
        aria-pressed={operator === value}
        aria-label={`Operator ${operator}`}
      >
        {OPERATOR_GLYPHS[operator]}
      </button>
    ))}
  </fieldset>
);
