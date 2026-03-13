import styles from "../inputs.module.css";
import type { Operator } from "../types";
import { memo } from "react";

export const OperatorPicker = memo(
  ({
    operator,
    setOperator,
  }: {
    operator: Operator;
    setOperator: (val: Operator) => void;
  }) => {
    return (
      <select
        className={styles.input}
        value={operator}
        onChange={(v) => setOperator(v.target.value as Operator)}
      >
        <option value="+">+</option>
        <option value="-">&ndash;</option>
        <option value="*">×</option>
        <option value="/">÷</option>
      </select>
    );
  },
);
