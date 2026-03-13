import styles from "../inputs.module.css";
import type { Special } from "../types";
import { memo, useImperativeHandle, useRef } from "react";

export const SpecialPicker = memo(
  ({
    special,
    setSpecial,
    ref,
  }: {
    special: Special;
    setSpecial: (value: Special) => void;
    ref?: React.Ref<{ focusAndSet: (spec: Special) => void }>;
  }) => {
    const inputRef = useRef<HTMLSelectElement>(null);

    useImperativeHandle(ref, () => ({
      focusAndSet: (spec: Special) => {
        inputRef.current?.focus();
        setSpecial(spec);
      },
    }));

    return (
      <select
        ref={inputRef}
        className={`${styles.input} w-auto`}
        value={special}
        onChange={(v) => setSpecial(v.target.value as Special)}
      >
        <option value="Normal">Normal</option>
        <option value="With Advantage">With Advantage</option>
        <option value="With Disadvantage">With Disadvantage</option>
        <option value="Exploding">Exploding</option>
      </select>
    );
  },
);
