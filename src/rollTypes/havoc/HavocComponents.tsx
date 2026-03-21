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
    const successCount = result.faces.filter(
      (f) => f.degree === "success",
    ).length;
    const critCount = result.faces.filter(
      (f) => f.degree === "critical",
    ).length;

    const renderSummary = () => {
      if (successCount === 0 && critCount === 0) {
        return <span>No successes</span>;
      }

      const parts: React.ReactNode[] = [];

      if (successCount > 0) {
        parts.push(
          <span key="success" className={faceStyles.successText}>
            {successCount} success{successCount === 1 ? "" : "es"}
          </span>,
        );
      }

      if (critCount > 0) {
        if (successCount > 0) {
          parts.push(<span key="comma">, </span>);
        }
        parts.push(
          <span key="crit" className={faceStyles.critText}>
            {critCount} crit{critCount === 1 ? "" : "s"}
          </span>,
        );
      }

      return parts;
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {result.faces.map((face, i) => (
            <span data-degree={face.degree} key={i} className={faceStyles.face}>
              {face.faceValue}
            </span>
          ))}
        </div>
        <div className="text-sm">{renderSummary()}</div>
      </div>
    );
  },
);
