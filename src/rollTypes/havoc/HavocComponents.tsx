import type { HavocFormula, HavocResult } from "./havocValidators";
import { memo } from "react";

export const HavocInputUI = memo(
  ({ onChange }: { onChange: (formula: HavocFormula) => void }) => {
    return (
      <input
        type="number"
        onChange={(e) => {
          onChange({ numDice: parseInt(e.target.value, 10) });
        }}
      />
    );
  },
);

export const HavocDisplay = memo(
  ({ result }: { formula: HavocFormula; result: HavocResult }) => {
    return (
      <div>
        {result.faces.map((face, i) => (
          <span key={i}>{face.faceValue}</span>
        ))}
      </div>
    );
  },
);
