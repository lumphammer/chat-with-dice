import { HAVOC_FAILURE_DEGREE } from "#/constants";
import faceStyles from "./faces.module.css";
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
      <div className="flex gap-2">
        {result.faces.map((face, i) => (
          <span data-degree={face.degree} key={i} className={faceStyles.face}>
            {face.faceValue}
          </span>
        ))}
      </div>
    );
  },
);
