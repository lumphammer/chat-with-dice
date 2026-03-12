import { useFormulaContext } from "./formulaContext";
import { Input } from "./inputs";
import { useState } from "react";

const specials = [
  "Normal",
  "With Advantage",
  "With Disadvantage",
  "Exploding",
] as const;
type Special = (typeof specials)[number];

const operators = ["+", "-", "*", "/"] as const;
type Operator = (typeof operators)[number];

export const StandardDieRollForm = () => {
  // const [formula, setFormula] = useState("");
  const [special, setSpecial] = useState<Special>("Normal");
  const { formula: upstreamFormula, setFormula: setUpstreamFormula } =
    useFormulaContext();
  const [arity, setArity] = useState("1");
  const [cardinality, setCardinality] = useState("6");
  const [operator, setOperator] = useState<Operator>("");
  const [modifier, setModifier] = useState("0");

  return (
    <div className="flex flex-1 flex-row">
      <Input
        value={arity}
        onChange={setArity}
        placeholder="E.g. 3d6, d100, 2d4+6 etc"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        type="number"
      />

      <select
        className="select w-auto border-none outline-none"
        value={cardinality}
        onChange={(v) => setCardinality(v.target.value)}
      >
        <option value="2">d2</option>
        <option value="3">d3</option>
        <option value="4">d4</option>
        <option value="6">d6</option>
        <option value="8">d8</option>
        <option value="10">d10</option>
        <option value="12">d12</option>
        <option value="20">d20</option>
        <option value="100">d100</option>
      </select>
      <select
        className="select w-auto border-none text-xl outline-none"
        value={operator}
        onChange={(v) => setOperator(v.target.value as Operator)}
      >
        <option value="+">+</option>
        <option value="-">-</option>
        <option value="*">*</option>
        <option value="/">/</option>
      </select>
      <Input
        value={modifier}
        onChange={setModifier}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        type="number"
      />

      <select
        className="select w-auto border-none outline-none"
        value={special}
        onChange={(v) => setSpecial(v.target.value as Special)}
      >
        <option value="Normal">Normal</option>
        <option value="With Advantage">With Advantage</option>
        <option value="With Disadvantage">With Disadvantage</option>
        <option value="Exploding">Exploding</option>
      </select>
    </div>
  );
};
