import { useFormulaContext } from "../formulaContext";
import styles from "../inputs.module.css";
import { memo } from "react";

export const FormulaForm = memo(() => {
  const { formula: upstreamFormula, setFormula: setUpstreamFormula } =
    useFormulaContext();

  return (
    <input
      type="number"
      min={1}
      className={`${styles.input} flex-1 px-4 text-left`}
      placeholder="Number of dice"
      value={upstreamFormula}
      onChange={(e) => setUpstreamFormula(e.target.value)}
    />
  );
});
