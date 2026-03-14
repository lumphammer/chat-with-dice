import { MatchCombobox } from "./MatchCombobox";
import { memo } from "react";

export const rollTypes = ["standard", "f20"] as const;
export type RollType = (typeof rollTypes)[number];

const ROLL_TYPE_ITEMS: Array<{ label: string; value: RollType }> = [
  { label: "Roll", value: "standard" },
  { label: "F20", value: "f20" },
];

export const RollTypePicker = memo(
  ({
    rollType,
    setRollType,
  }: {
    rollType: RollType;
    setRollType: (val: RollType) => void;
  }) => (
    <MatchCombobox
      items={ROLL_TYPE_ITEMS}
      value={rollType}
      onValueChange={setRollType}
      inputClassName="bg-primary/10 border-base-content/30 field-sizing-content
        w-30 rounded-none border-r px-4 py-2 outline-none"
      ariaLabel="Roll Type"
    />
  ),
);
