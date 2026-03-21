import type { HavocFormula, HavocResult } from "./havocValidators";
import styles from "@/styles/inputs.module.css";
import { memo, useId } from "react";

export const HavocInputUI = memo(
  ({ onChange }: { onChange: (formula: HavocFormula) => void }) => {
    // useEffect(() => {}, []);
    const id = useId();

    return (
      <>
        <label className={`${styles.label} w-max-20`} htmlFor={id}>
          Number of dice:
        </label>
        <input
          id={id}
          type="number"
          min={1}
          defaultValue={1}
          className={`${styles.input} max-w-40 flex-1 px-4 pr-0 text-left`}
          placeholder="Number of dice"
          onChange={(e) => {
            onChange({ numDice: parseInt(e.target.value, 10) });
          }}
        />
      </>
    );
  },
);

export const HavocDisplay = memo(
  ({ result }: { formula: HavocFormula; result: HavocResult }) => {
    return (
      <div>
        {result.faces.map((face, i) => (
          <span key={i}>{face.faceValue}</span>
        ))}
      </div>
    );
  },
);
