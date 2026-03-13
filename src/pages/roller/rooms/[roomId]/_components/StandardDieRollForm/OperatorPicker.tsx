import styles from "../inputs.module.css";
import type { Operator } from "../types";
import { memo, useImperativeHandle, useRef } from "react";

export const OperatorPicker = memo(
  ({
    operator,
    setOperator,
    ref,
    onGoToModifier,
  }: {
    operator: Operator;
    setOperator: (val: Operator) => void;
    ref?: React.Ref<{ focusAndSet: (operator: Operator) => void }>;
    onGoToModifier?: (mod: string) => void;
  }) => {
    const selectRef = useRef<HTMLSelectElement>(null);

    useImperativeHandle(ref, () => {
      return {
        focusAndSet(op: Operator) {
          setOperator(op);
          console.log("focusAndSet", op, "ref is", selectRef.current);
          selectRef.current?.focus();
        },
      };
    }, [setOperator]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
      if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].includes(e.key)) {
        e.preventDefault();
        onGoToModifier?.(e.key);
      }
    };

    return (
      <select
        ref={selectRef}
        className={`${styles.input} text-3xl`}
        value={operator}
        onChange={(v) => setOperator(v.target.value as Operator)}
        onKeyDown={handleKeyDown}
      >
        <option value="+">+</option>
        <option value="-">&ndash;</option>
        <option value="*">×</option>
        <option value="/">÷</option>
      </select>
    );
  },
);
