import styles from "../inputs.module.css";
import type { Special } from "../types";
import { memo, useImperativeHandle, useRef } from "react";

export const ModifierPicker = memo(
  ({
    modifier,
    setModifier,
    ref,
    onGoToSpecial,
  }: {
    modifier: string;
    setModifier: (value: string) => void;
    ref?: React.Ref<{ focusAndSet: (mod: string) => void }>;
    onGoToSpecial?: (spec: Special) => void;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
      focusAndSet: (mod: string) => {
        inputRef.current?.focus();
        setModifier(mod);
      },
    }));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        onGoToSpecial?.("With Advantage");
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        onGoToSpecial?.("With Disadvantage");
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        onGoToSpecial?.("Exploding");
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        onGoToSpecial?.("Normal");
      }
    };

    return (
      <input
        ref={inputRef}
        className={styles.input}
        value={modifier}
        onChange={(e) => setModifier(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        type="number"
      />
    );
  },
);
