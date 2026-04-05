import styles from "@/styles/inputs.module.css";
import { memo, useId } from "react";
import type { GeeseFormula } from "./geeseValidators";

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
              action: "roll",
              numDice: parseInt(e.target.value, 10),
              previousRounds: [],
            });
          }}
        />
      </>
    );
  },
);

GeeseInputUI.displayName = "GeeseInputUI";
