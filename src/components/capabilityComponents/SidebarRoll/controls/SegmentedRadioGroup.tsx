import { Fieldset } from "./Fieldset";
import type { ReactNode } from "react";

export type SegmentedRadioOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

export const SegmentedRadioGroup = <Value extends string>({
  name,
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  disabled = false,
  optionClassName = "",
}: {
  name: string;
  value?: Value;
  options: readonly SegmentedRadioOption<Value>[];
  onChange: (value: Value) => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  optionClassName?: string;
}) => {
  const controls = options.map((option) => {
    const isSelected = option.value === value;
    const isDisabled = disabled || option.disabled;
    return (
      <label
        key={option.value}
        // className={`${optionClassName} btn btn-sm btn-neutral
        //   focus-within:ring-primary/50 join-item has-checked:btn-primary
        //   has-disabled:btn-disabled group-disabled:btn-disabled
        //   group-has-disabled:btn-disabled disabled:btn-disabled min-w-0 flex-1
        //   px-1 focus-within:ring-2`}
        className={`${optionClassName} btn btn-sm btn-neutral
          focus-within:ring-primary/50 join-item has-checked:btn-primary
          has-disabled:btn-disabled min-w-0 flex-1 px-1 focus-within:ring-2`}
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
  });

  // Both branches take `className`. It used to be applied only to the labelled
  // one, which silently dropped DieSizeToggle's `flex-1` — leaving the group at
  // `w-full` beside the "d" prefix, so the row asked for more than 100% of its
  // fieldset and the die labels got clipped on a narrow sidebar.
  if (!ariaLabel)
    return (
      <div
        className={`group join m-0 w-full min-w-0 border-0 p-0 ${className}`}
      >
        {controls}
      </div>
    );

  return (
    <Fieldset
      className={`group join m-0 w-full min-w-0 border-0 p-0 ${className}`}
      label={ariaLabel}
      disabled={disabled}
      showLegend={false}
    >
      {controls}
    </Fieldset>
  );
};
