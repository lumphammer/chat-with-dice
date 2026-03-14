import { useFormulaContext } from "../formulaContext";
import styles from "../inputs.module.css";
import { memo } from "react";

export const FormulaForm = memo(() => {
  const { formula: upstreamFormula, setFormula: setUpstreamFormula } =
    useFormulaContext();

  return (
    <input
      className={`${styles.input} flex-1 px-4 text-left`}
      placeholder="E.g. 2d12, 3d6dl"
      value={upstreamFormula}
      onChange={(e) => setUpstreamFormula(e.target.value)}
    />
  );
});
