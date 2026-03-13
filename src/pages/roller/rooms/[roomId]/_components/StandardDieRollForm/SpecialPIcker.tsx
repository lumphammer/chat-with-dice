import styles from "../inputs.module.css";
import type { Special } from "../types";
import { memo } from "react";

export const SpecialPicker = memo(
  ({
    special,
    setSpecial,
  }: {
    special: Special;
    setSpecial: (value: Special) => void;
  }) => {
    return (
      <select
        className={`${styles.input} w-auto`}
        value={special}
        onChange={(v) => setSpecial(v.target.value as Special)}
      >
        <option value="Normal">Normal</option>
        <option value="With Advantage">With Advantage</option>
        <option value="With Disadvantage">With Disadvantage</option>
        <option value="Exploding">Exploding</option>
      </select>
    );
  },
);
