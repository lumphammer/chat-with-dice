import {
  DIE_CHOICES,
  type Favour,
  type Keep,
  type Operator,
  type RollFormula,
} from "#/capabilities/roll/common";
import { Dices } from "lucide-react";
import { memo, useState } from "react";

type RollFormProps = {
  onRoll: (formula: RollFormula) => void;
};

const RADIX_DECIMAL = 10;
const MAX_ARITY = 20;

const DEFAULT_DIE_LABEL = "d6";

const KEEP_OPTIONS: { value: Keep; label: string }[] = [
  { value: "all", label: "All dice" },
  { value: "highest", label: "Keep highest" },
  { value: "lowest", label: "Keep lowest" },
  { value: "dropHighest", label: "Drop highest" },
  { value: "dropLowest", label: "Drop lowest" },
];

const FAVOUR_OPTIONS: { value: Favour; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "advantage", label: "Advantage" },
  { value: "disadvantage", label: "Disadvantage" },
];

const OPERATOR_OPTIONS: Operator[] = ["+", "-", "*", "/"];

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    className="text-base-content/50 mb-1 text-xs font-semibold tracking-wide
      uppercase"
  >
    {children}
  </p>
);

export const RollForm = memo(({ onRoll }: RollFormProps) => {
  const [arity, setArity] = useState(1);
  const [dieLabel, setDieLabel] = useState<string>(DEFAULT_DIE_LABEL);
  const [keep, setKeep] = useState<Keep>("all");
  const [favour, setFavour] = useState<Favour>("normal");
  const [exploding, setExploding] = useState(false);
  const [modOp, setModOp] = useState<Operator>("+");
  const [modOperand, setModOperand] = useState(0);

  const handleReset = () => {
    setArity(1);
    setDieLabel(DEFAULT_DIE_LABEL);
    setKeep("all");
    setFavour("normal");
    setExploding(false);
    setModOp("+");
    setModOperand(0);
  };

  const handleRoll = () => {
    const die =
      DIE_CHOICES.find((choice) => choice.label === dieLabel) ?? DIE_CHOICES[1];
    onRoll({
      arity: Math.max(1, arity),
      cardinality: die.cardinality,
      dieType: die.dieType,
      keep,
      favour,
      exploding,
      modifier:
        modOperand !== 0 ? { operator: modOp, operand: modOperand } : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dice count + size */}
      <div>
        <FieldLabel>Dice</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={MAX_ARITY}
            value={arity}
            onChange={(e) =>
              setArity(
                Math.max(1, parseInt(e.target.value, RADIX_DECIMAL) || 1),
              )
            }
            onFocus={(e) => e.target.select()}
            className="input input-sm w-16 text-center"
            aria-label="Number of dice"
          />
          <span className="text-base-content/40 font-mono font-bold">d</span>
          <select
            value={dieLabel}
            onChange={(e) => setDieLabel(e.target.value)}
            className="select select-sm flex-1"
            aria-label="Die size"
          >
            {DIE_CHOICES.map((choice) => (
              <option key={choice.label} value={choice.label}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Favour */}
      <div>
        <FieldLabel>Favour</FieldLabel>
        <select
          value={favour}
          onChange={(e) => setFavour(e.target.value as Favour)}
          className="select select-sm w-full"
        >
          {FAVOUR_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Keep */}
      <div>
        <FieldLabel>Keep</FieldLabel>
        <select
          value={keep}
          onChange={(e) => setKeep(e.target.value as Keep)}
          className="select select-sm w-full"
        >
          {KEEP_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Exploding */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={exploding}
          onChange={(e) => setExploding(e.target.checked)}
          className="checkbox checkbox-sm"
        />
        <span className="text-sm">Exploding dice</span>
      </label>

      {/* Modifier */}
      <div>
        <FieldLabel>Modifier</FieldLabel>
        <div className="flex items-center gap-2">
          <select
            value={modOp}
            onChange={(e) => setModOp(e.target.value as Operator)}
            className="select select-sm w-16"
            aria-label="Modifier operator"
          >
            {OPERATOR_OPTIONS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={modOperand}
            onChange={(e) =>
              setModOperand(parseInt(e.target.value, RADIX_DECIMAL) || 0)
            }
            onFocus={(e) => e.target.select()}
            className="input input-sm flex-1 text-center"
            aria-label="Modifier value"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleRoll}
        className="btn btn-primary mt-2 w-full"
      >
        <Dices className="h-5 w-5" />
        Roll
      </button>
      <button
        type="button"
        onClick={handleReset}
        className="btn btn-ghost btn-sm w-full"
      >
        Reset
      </button>
    </div>
  );
});

RollForm.displayName = "RollForm";
