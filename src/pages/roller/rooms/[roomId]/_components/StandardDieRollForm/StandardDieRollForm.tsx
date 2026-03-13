import { useFormulaContext } from "../formulaContext";
import styles from "../inputs.module.css";
import type { Operator, Special } from "../types";
import { ArityPicker } from "./ArityPicker";
import { DieSizePicker } from "./DieSizePicker";
import { ModifierPicker } from "./ModifierPicker";
import { OperatorPicker } from "./OperatorPicker";
import { SpecialPicker } from "./SpecialPIcker";
import { useState } from "react";

export const StandardDieRollForm = () => {
  // const [formula, setFormula] = useState("");
  const [special, setSpecial] = useState<Special>("Normal");
  const { formula: upstreamFormula, setFormula: setUpstreamFormula } =
    useFormulaContext();
  const [arity, setArity] = useState("1");
  const [cardinality, setCardinality] = useState("6");
  const [operator, setOperator] = useState<Operator>("+");
  const [modifier, setModifier] = useState("0");

  return (
    <div className="flex flex-1 flex-row">
      {/*die count */}
      <ArityPicker arity={arity} setArity={setArity} />

      {/* die size */}
      <DieSizePicker
        cardinality={cardinality}
        setCardinality={setCardinality}
      />

      {/* operator */}
      <OperatorPicker operator={operator} setOperator={setOperator} />

      {/* modifier */}
      <ModifierPicker modifier={modifier} setModifier={setModifier} />

      {/* Special modes */}
      <SpecialPicker special={special} setSpecial={setSpecial} />

      <div
        className="flex flex-col items-center justify-center px-4 text-sm
          opacity-70"
      >
        Arity: {arity} Cardinality: {cardinality}
      </div>
    </div>
  );
};
