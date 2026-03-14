import { useFormulaContext } from "../formulaContext";
import type { Operator, Special } from "../types";
import { ArityPicker } from "./ArityPicker";
import { CardinalityPicker } from "./CardinalityPicker";
import { ModifierPicker } from "./ModifierPicker";
import { OperatorPicker } from "./OperatorPicker";
import { SpecialPicker } from "./SpecialPicker";
import { useCallback, useRef, useState } from "react";

export const StandardDieRollForm = () => {
  // const [formula, setFormula] = useState("");
  const { formula: upstreamFormula, setFormula: setUpstreamFormula } =
    useFormulaContext();
  const [special, setSpecial] = useState<Special>("Normal");
  const [arity, setArity] = useState("1");
  const [cardinality, setCardinality] = useState("6");
  const [operator, setOperator] = useState<Operator>("+");
  const [modifier, setModifier] = useState("0");

  const cardinalityRef = useRef<{ focus: () => void }>(null);
  const operatorRef = useRef<{ focusAndSet: (op: Operator) => void }>(null);
  const modifierRef = useRef<{ focusAndSet: (mod: string) => void }>(null);
  const specialRef = useRef<{ focusAndSet: (spec: Special) => void }>(null);

  const goToCardinality = useCallback(() => {
    cardinalityRef.current?.focus();
  }, []);

  const goToOperator = useCallback((op: Operator) => {
    operatorRef.current?.focusAndSet(op);
  }, []);

  const goToModifier = useCallback((mod: string) => {
    modifierRef.current?.focusAndSet(mod);
  }, []);

  const goToSpecial = useCallback((spec: Special) => {
    specialRef.current?.focusAndSet(spec);
  }, []);

  return (
    <div className="flex flex-1 flex-row">
      {/*die count */}
      <ArityPicker
        arity={arity}
        setArity={setArity}
        onGoToCardinality={goToCardinality}
      />

      {/* die size */}
      <CardinalityPicker
        cardinality={cardinality}
        setCardinality={setCardinality}
        ref={cardinalityRef}
        onGoToOperator={goToOperator}
      />

      {/* operator */}
      <OperatorPicker
        ref={operatorRef}
        operator={operator}
        setOperator={setOperator}
        onGoToModifier={goToModifier}
      />

      {/* modifier */}
      <ModifierPicker
        ref={modifierRef}
        modifier={modifier}
        setModifier={setModifier}
        onGoToSpecial={goToSpecial}
      />

      {/* Special modes */}
      <SpecialPicker
        ref={specialRef}
        special={special}
        setSpecial={setSpecial}
      />
      {/*
      <div
        className="flex flex-col items-center justify-center px-4 text-sm
          opacity-70"
      >
        Arity: {arity} Cardinality: {cardinality}
      </div>*/}
    </div>
  );
};
