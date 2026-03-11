import { Input } from "./inputs";
import { useState } from "react";

const specials = [
  "Normal",
  "With Advantage",
  "With Disadvantage",
  "Exploding",
] as const;
type Special = (typeof specials)[number];

export const StandardDieRollForm = () => {
  const [formula, setFormula] = useState("");
  const [special, setSpecial] = useState<Special>("Normal");

  return (
    <div className="flex flex-1 flex-row">
      <Input
        value={formula}
        onChange={setFormula}
        placeholder="E.g. 3d6, d100, 2d4+6 etc"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <select
        className="select select-soft bg-base-100 my-1 h-3 w-auto px-4 py-1
          text-sm outline-none"
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
