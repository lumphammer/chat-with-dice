import type { Favour, Keep, Operator } from "#/capabilities/rollCapability";
import { Dices } from "lucide-react";
import { memo, useState } from "react";

type RollFormula = {
  arity: number;
  cardinality: number;
  modifier?: { operator: Operator; operand: number };
  favour: Favour;
  keep: Keep;
  exploding: boolean;
};

type RollFormProps = {
  onRoll: (formula: RollFormula) => void;
};

const RADIX_DECIMAL = 10;
const MAX_ARITY = 20;

const D4 = 4;
const D6 = 6;
const D8 = 8;
const D10 = 10;
const D12 = 12;
const D20 = 20;
const D100 = 100;

const DEFAULT_CARDINALITY = D6;

const COMMON_DIE_SIZES = [D4, D6, D8, D10, D12, D20, D100] as const;

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
  const [cardinality, setCardinality] = useState(DEFAULT_CARDINALITY);
  const [keep, setKeep] = useState<Keep>("all");
  const [favour, setFavour] = useState<Favour>("normal");
  const [exploding, setExploding] = useState(false);
  const [modOp, setModOp] = useState<Operator>("+");
  const [modOperand, setModOperand] = useState(0);

  const handleReset = () => {
    setArity(1);
    setCardinality(DEFAULT_CARDINALITY);
    setKeep("all");
    setFavour("normal");
    setExploding(false);
    setModOp("+");
    setModOperand(0);
  };

  const handleRoll = () => {
    onRoll({
      arity: Math.max(1, arity),
      cardinality: Math.max(1, cardinality),
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
            value={cardinality}
            onChange={(e) =>
              setCardinality(parseInt(e.target.value, RADIX_DECIMAL))
            }
            className="select select-sm flex-1"
            aria-label="Die size"
          >
            {COMMON_DIE_SIZES.map((size) => (
              <option key={size} value={size}>
                d{size}
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
