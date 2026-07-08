import type { Keep } from "#/capabilities/roll/common";

type KeepToggleProps = {
  value: Keep;
  onChange: (keep: Keep) => void;
};

// The five Keep values decomposed into two axes on one row:
//   [ All | Keep | Drop ]  ×  [ High | Low ]
// "All" disables the end group (there's no extreme to target), so the
// impossible states are unrepresentable and every label stays short.

type KeepMode = "all" | "keep" | "drop";
type KeepEnd = "high" | "low";

const KEEP_DECODE: Record<Keep, { mode: KeepMode; end: KeepEnd }> = {
  all: { mode: "all", end: "high" },
  highest: { mode: "keep", end: "high" },
  lowest: { mode: "keep", end: "low" },
  dropHighest: { mode: "drop", end: "high" },
  dropLowest: { mode: "drop", end: "low" },
};

const encodeKeep = (mode: KeepMode, end: KeepEnd): Keep => {
  if (mode === "all") return "all";
  if (mode === "keep") return end === "high" ? "highest" : "lowest";
  return end === "high" ? "dropHighest" : "dropLowest";
};

const KEEP_MODES: { value: KeepMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "keep", label: "Keep" },
  { value: "drop", label: "Drop" },
];
const KEEP_ENDS: { value: KeepEnd; label: string }[] = [
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
];

export const KeepToggle = ({ value, onChange }: KeepToggleProps) => {
  const { mode, end } = KEEP_DECODE[value];
  return (
    <div className="flex gap-2">
      <fieldset
        className="join m-0 min-w-0 flex-1 border-0 p-0"
        aria-label="Keep or drop dice"
      >
        {KEEP_MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(encodeKeep(option.value, end))}
            className={`btn btn-sm join-item min-w-0 flex-1 px-1 ${
              option.value === mode ? "btn-primary" : "btn-neutral"
            }`}
            aria-pressed={option.value === mode}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
      <fieldset
        className="join m-0 min-w-0 border-0 p-0"
        aria-label="Which end"
      >
        {KEEP_ENDS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={mode === "all"}
            onClick={() => onChange(encodeKeep(mode, option.value))}
            className={`btn btn-sm join-item px-2 ${
              mode !== "all" && option.value === end
                ? "btn-primary"
                : "btn-neutral"
            }`}
            aria-pressed={mode !== "all" && option.value === end}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
};
