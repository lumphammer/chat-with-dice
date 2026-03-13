import styles from "../inputs.module.css";
import { memo, useImperativeHandle, useRef } from "react";

export const ModifierPicker = memo(
  ({
    modifier,
    setModifier,
    ref,
  }: {
    modifier: string;
    setModifier: (value: string) => void;
    ref?: React.Ref<{ focusAndSet: (mod: string) => void }>;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
      focusAndSet: (mod: string) => {
        inputRef.current?.focus();
        setModifier(mod);
      },
    }));

    return (
      <input
        ref={inputRef}
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
