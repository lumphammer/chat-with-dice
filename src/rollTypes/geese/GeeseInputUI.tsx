import type { GeeseFormula } from "./geeseValidators";
import styles from "@/styles/inputs.module.css";
import { memo, useId } from "react";

export const GeeseInputUI = memo(
  ({ onChange }: { onChange: (formula: GeeseFormula) => void }) => {
    const id = useId();

    return (
      <>
        <label className={`${styles.label} w-max-20`} htmlFor={id}>
          Dice pool (d6s):
        </label>
        <input
          id={id}
          type="number"
          min={1}
          defaultValue={1}
          className={`${styles.input} max-w-40 flex-1 px-4 pr-0 text-left`}
          placeholder="Number of dice"
          onChange={(e) => {
            onChange({
              action: "start",
              numDice: parseInt(e.target.value, 10),
            });
          }}
        />
      </>
    );
  },
);

GeeseInputUI.displayName = "GeeseInputUI";
