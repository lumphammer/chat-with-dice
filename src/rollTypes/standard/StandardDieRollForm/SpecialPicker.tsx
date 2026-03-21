import type { Special } from "./types";
import {
  MatchCombobox,
  type MatchComboboxRef,
} from "@/components/MatchCombobox";
import styles from "@/styles/inputs.module.css";
import { memo } from "react";

const SPECIAL_ITEMS: Array<{ label: string; value: Special }> = [
  { label: "Normal", value: "Normal" },
  { label: "With Advantage", value: "With Advantage" },
  { label: "With Disadvantage", value: "With Disadvantage" },
  { label: "Exploding", value: "Exploding" },
];

export const SpecialPicker = memo(
  ({
    special,
    setSpecial,
    ref,
  }: {
    special: Special;
    setSpecial: (value: Special) => void;
    ref?: React.Ref<MatchComboboxRef<Special>>;
  }) => (
    <MatchCombobox
      items={SPECIAL_ITEMS}
      value={special}
      onValueChange={setSpecial}
      controlClassName="h-full w-auto"
      inputClassName={`${styles.input} h-full w-auto`}
      ariaLabel="Special"
      ref={ref}
    />
  ),
);
