import type { NotationFormula } from "./notationRollValidators";
import styles from "@/styles/inputs.module.css";
import { memo } from "react";

export const NotationInput = memo(
  ({ onChange }: { onChange: (newFormula: NotationFormula) => void }) => {
    return (
      <input
        className={`${styles.input} flex-1 px-4 text-left`}
        placeholder="E.g. 2d12, 3d6dl"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
);
