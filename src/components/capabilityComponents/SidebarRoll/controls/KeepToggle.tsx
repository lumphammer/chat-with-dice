import type { Keep } from "#/capabilities/roll/common";
import { SegmentedRadioGroup } from "./SegmentedRadioGroup";
import { useId } from "react";

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
  const modeName = useId();
  const endName = useId();
  return (
    <div className="flex gap-2">
      <SegmentedRadioGroup
        name={modeName}
        value={mode}
        options={KEEP_MODES}
        onChange={(nextMode) => onChange(encodeKeep(nextMode, end))}
        className="join min-w-0 flex-1"
        ariaLabel="Keep or drop dice"
      />
      <SegmentedRadioGroup
        name={endName}
        value={mode === "all" ? undefined : end}
        options={KEEP_ENDS}
        onChange={(nextEnd) => onChange(encodeKeep(mode, nextEnd))}
        className="join min-w-0"
        disabled={mode === "all"}
        optionClassName="btn btn-sm join-item px-2"
        ariaLabel="Which end"
      />
    </div>
  );
};
