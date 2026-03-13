import styles from "../inputs.module.css";
import { memo } from "react";

export const ModifierPicker = memo(
  ({
    modifier,
    setModifier,
  }: {
    modifier: string;
    setModifier: (value: string) => void;
  }) => {
    return (
      <input
        className={styles.input}
        value={modifier}
        onChange={(e) => setModifier(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        type="number"
      />
    );
  },
);
