import type { ReactNode } from "react";

export type SegmentedRadioOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

type SegmentedRadioGroupProps<Value extends string> = {
  name: string;
  value?: Value;
  options: readonly SegmentedRadioOption<Value>[];
  onChange: (value: Value) => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  optionClassName?: string;
};

export const SegmentedRadioGroup = <Value extends string>({
  name,
  value,
  options,
  onChange,
  ariaLabel,
  className = "join w-full",
  disabled = false,
  optionClassName = "btn btn-sm join-item min-w-0 flex-1 px-1",
}: SegmentedRadioGroupProps<Value>) => {
  const controls = (
    <div className={className}>
      {options.map((option) => {
        const isSelected = option.value === value;
        const isDisabled = disabled || option.disabled;
        return (
          <label
            key={option.value}
            className={`${optionClassName} focus-within:ring-primary/50
            focus-within:ring-2 ${isSelected ? "btn-primary" : "btn-neutral"}
            ${isDisabled ? "btn-disabled" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              disabled={isDisabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
              aria-label={option.ariaLabel}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );

  if (!ariaLabel) return controls;

  return (
    <fieldset
      className="m-0 min-w-0 border-0 p-0"
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {controls}
    </fieldset>
  );
};
