import styles from "../inputs.module.css";
import { memo } from "react";

export const ArityPicker = memo(
  ({
    arity,
    setArity,
  }: {
    arity: string;
    setArity: (value: string) => void;
  }) => {
    return (
      <input
        value={arity}
        className={`${styles.input} text-right`}
        onChange={(e) => setArity(e.target.value)}
        placeholder="Number"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        type="number"
        /* oxlint-disable-next-line jsx-a11y/no-autofocus */
        autoFocus
      />
    );
  },
);
