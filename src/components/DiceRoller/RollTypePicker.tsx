import type { RollTypeName } from "#/rollTypes/rollTypeRegistry";
import { MatchCombobox, type MatchItem } from "../MatchCombobox";
import { memo } from "react";

const rollTypeLabels: Record<RollTypeName, string> = {
  standard: "Roll",
  // f20: "F20",
  // formula: "Formula",
  havoc: "Havoc",
  // fitd: "FITD",
  notation: "Notation",
  geese: "Geese",
};

const rollTypeItems = Object.entries(rollTypeLabels).map(([value, label]) => ({
  label,
  value,
})) as MatchItem<RollTypeName>[];

export const RollTypePicker = memo(
  ({
    rollType,
    setRollType,
  }: {
    rollType: RollTypeName;
    setRollType: (val: RollTypeName) => void;
  }) => (
    <MatchCombobox
      items={rollTypeItems}
      value={rollType}
      onValueChange={setRollType}
      inputClassName="bg-primary/10 border-base-content/30 field-sizing-content
        w-30 rounded-none border-r px-4 py-2 outline-none"
      ariaLabel="Roll Type"
    />
  ),
);
