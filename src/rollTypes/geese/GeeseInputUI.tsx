import type { GeeseFormula } from "./geeseValidators";
import styles from "@/styles/inputs.module.css";
import { memo, useId, useState, useCallback, type ChangeEvent } from "react";

export const GeeseInputUI = memo(
  ({ onChange }: { onChange: (formula: GeeseFormula) => void }) => {
    const diceId = useId();
    const descriptionId = useId();

    const [numDice, setNumDice] = useState(1);
    const [schemeDescription, setSchemeDescription] = useState("");

    const handleDiceChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const newNumDice = parseInt(e.target.value, 10);
        setNumDice(newNumDice);
        onChange({
          action: "start",
          numDice: newNumDice,
          schemeDescription: schemeDescription || undefined,
        });
      },
      [schemeDescription, onChange],
    );

    const handleDescriptionChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const newDescription = e.target.value;
        setSchemeDescription(newDescription);
        onChange({
          action: "start",
          numDice,
          schemeDescription: newDescription || undefined,
        });
      },
      [numDice, onChange],
    );

    return (
      <>
        <label className={`${styles.label} w-max-20`} htmlFor={diceId}>
          Dice pool (d6s):
        </label>
        <input
          id={diceId}
          type="number"
          min={1}
          value={numDice}
          className={`${styles.input} max-w-40 flex-1 px-4 pr-0 text-left`}
          placeholder="Number of dice"
          onChange={handleDiceChange}
        />
        <input
          id={descriptionId}
          type="text"
          value={schemeDescription}
          className={`${styles.input} flex-1 px-4 text-left placeholder:italic`}
          placeholder="Scheme, gambit, ruse etc. (optional)"
          onChange={handleDescriptionChange}
        />
      </>
    );
  },
);

GeeseInputUI.displayName = "GeeseInputUI";
