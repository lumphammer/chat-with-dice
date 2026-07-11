import {
  DIE_CHOICES,
  type Favour,
  type Keep,
  type Operator,
  type RollFormula,
} from "#/capabilities/roll/common";
import { DieSizeToggle } from "./controls/DieSizeToggle";
import { ExplodingToggle } from "./controls/ExplodingToggle";
import { FavourToggle } from "./controls/FavourToggle";
import { Fieldset } from "./controls/Fieldset";
import { KeepToggle } from "./controls/KeepToggle";
import { NumberCombo } from "./controls/NumberCombo";
import { OperatorToggle } from "./controls/OperatorToggle";
import { OPERATOR_GLYPHS } from "./controls/operatorGlyphs";
import { Dices } from "lucide-react";
import { memo, useState } from "react";

type RollFormProps = {
  onRoll: (formula: RollFormula) => void;
};

const MAX_ARITY = 20;
const DEFAULT_DIE_LABEL = "d6";
// Values offered in each NumberCombo's ⋮ menu: 1…6, the common low counts.
const QUICK_PICK_COUNT = 6;
const QUICK_PICKS = Array.from(
  { length: QUICK_PICK_COUNT },
  (_, index) => index + 1,
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

  // Live preview of the formula on the Roll button, e.g. "Roll 2d6 × 2".
  const rollSummary = (
    <>
      {Math.max(1, arity)}
      {dieLabel}{" "}
      {modOperand !== 0 ? (
        <>
          <span className="text-xl">{OPERATOR_GLYPHS[modOp]}</span>
          {modOperand}
        </>
      ) : (
        ""
      )}
    </>
  );

  const handleRoll = () => {
    const die =
      DIE_CHOICES.find((choice) => choice.label === dieLabel) ?? DIE_CHOICES[1];
    const normalizedArity = Math.max(1, Math.trunc(arity));
    const normalizedModOperand = Math.trunc(modOperand);

    onRoll({
      arity: normalizedArity,
      cardinality: die.cardinality,
      dieType: die.dieType,
      keep,
      favour,
      exploding,
      modifier:
        normalizedModOperand !== 0
          ? { operator: modOp, operand: normalizedModOperand }
          : undefined,
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleRoll();
      }}
      className="mt-4 flex flex-col gap-4"
    >
      <Fieldset label="Number of dice">
        <NumberCombo
          value={arity}
          onChange={(n) => setArity(Math.max(1, Math.trunc(n)))}
          min={1}
          max={MAX_ARITY}
          quickOptions={QUICK_PICKS}
          ariaLabel="Number of dice"
        />
      </Fieldset>

      <DieSizeToggle value={dieLabel} onChange={setDieLabel} />

      <Fieldset label="Modifier">
        <div className="flex flex-col gap-2">
          <OperatorToggle value={modOp} onChange={setModOp} />
          <NumberCombo
            value={modOperand}
            onChange={(n) => setModOperand(Math.trunc(n))}
            min={0}
            quickOptions={QUICK_PICKS}
            ariaLabel="Modifier value"
          />
        </div>
      </Fieldset>

      <FavourToggle value={favour} onChange={setFavour} />

      <KeepToggle value={keep} onChange={setKeep} />

      <ExplodingToggle value={exploding} onChange={setExploding} />

      <button type="submit" className="btn btn-primary mt-2 w-full">
        <Dices className="h-5 w-5" />
        Roll {rollSummary}
      </button>
      <button
        type="button"
        onClick={handleReset}
        className="btn btn-ghost btn-sm w-full"
      >
        Reset
      </button>
    </form>
  );
});

RollForm.displayName = "RollForm";
