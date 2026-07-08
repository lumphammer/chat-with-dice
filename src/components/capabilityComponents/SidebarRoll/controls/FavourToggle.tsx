import type { Favour } from "#/capabilities/roll/common";

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

export const FavourToggle = ({ value, onChange }: FavourToggleProps) => (
  <fieldset
    className="join m-0 w-full min-w-0 border-0 p-0"
    aria-label="Favour"
  >
    {FAVOUR_OPTIONS.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`btn btn-sm join-item min-w-0 flex-1 px-1 ${
          option.value === value ? "btn-primary" : "btn-neutral"
        }`}
        aria-pressed={option.value === value}
      >
        {option.label}
      </button>
    ))}
  </fieldset>
);
