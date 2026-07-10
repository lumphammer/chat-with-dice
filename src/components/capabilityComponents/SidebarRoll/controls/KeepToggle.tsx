import type { Keep } from "#/capabilities/roll/common";
import { Fieldset } from "./Fieldset";
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
    <Fieldset label="Keep" className="flex gap-2">
      <SegmentedRadioGroup
        name={modeName}
        value={mode}
        options={KEEP_MODES}
        className="flex-1"
        onChange={(nextMode) => onChange(encodeKeep(nextMode, end))}
        ariaLabel="Keep or drop dice"
      />
      <SegmentedRadioGroup
        name={endName}
        value={mode === "all" ? undefined : end}
        options={KEEP_ENDS}
        onChange={(nextEnd) => onChange(encodeKeep(mode, nextEnd))}
        className="flex-1"
        disabled={mode === "all"}
        ariaLabel="Which end"
      />
    </Fieldset>
  );
};
