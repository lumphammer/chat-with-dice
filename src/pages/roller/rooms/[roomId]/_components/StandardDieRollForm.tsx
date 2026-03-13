import { useFormulaContext } from "./formulaContext";
import { Input } from "./inputs";
import styles from "./inputs.module.css";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
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

const presetDiceSizes = [2, 3, 4, 6, 8, 10, 12, 20, 100];

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
      <input
        value={arity}
        className={`${styles.input} text-right`}
        onChange={(e) => setArity(e.target.value)}
        placeholder="Number"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        type="number"
        autoFocus
      />

      {/* die size */}
      <Combobox
        value={cardinality}
        immediate
        onChange={(val) => {
          if (val !== null) {
            console.log("Combobox#onChange", val);
            setCardinality(val);
          }
        }}
      >
        <ComboboxInput
          className={styles.input}
          aria-label="Die Size"
          displayValue={(cardi: number) => `d${cardi}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={(event) => {
            const trimmed = event.target.value.replaceAll(/\D+/g, "");
            console.log("ComboboxInput#onChange", trimmed);
            setCardinality(trimmed);
          }}
        />
        <ComboboxOptions anchor="bottom" className="border empty:invisible">
          {presetDiceSizes.map((cardi) => (
            <ComboboxOption
              key={cardi}
              value={cardi}
              className="data-focus:bg-blue-100"
            >
              d{cardi}
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>

      {/*<select
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
      </select>*/}

      {/* operator */}
      <select
        className={styles.input}
        value={operator}
        onChange={(v) => setOperator(v.target.value as Operator)}
      >
        <option value="+">+</option>
        <option value="-">&ndash;</option>
        <option value="*">×</option>
        <option value="/">÷</option>
      </select>
      {/* modifier */}
      <input
        // className="bg-base-100 border-base-content/30 w-16 rounded-none border-r
        //   text-center [&::-webkit-inner-spin-button]:-my-2
        //   [&::-webkit-inner-spin-button]:me-1"
        className={styles.input}
        value={modifier}
        onChange={(e) => setModifier(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        type="number"
      />
      {/* Special modes */}
      <select
        // className="[&_option]:bg-base-100 bg-base-100 border-base-content/30
        //   w-auto appearance-none border-r px-4 outline-none [&_option]:px-4"
        className={`${styles.input} w-auto`}
        value={special}
        onChange={(v) => setSpecial(v.target.value as Special)}
      >
        <option value="Normal">Normal</option>
        <option value="With Advantage">With Advantage</option>
        <option value="With Disadvantage">With Disadvantage</option>
        <option value="Exploding">Exploding</option>
      </select>
      <div
        className="flex flex-col items-center justify-center px-4 text-sm
          opacity-70"
      >
        Arity: {arity} Cardinality: {cardinality}
      </div>
    </div>
  );
};
