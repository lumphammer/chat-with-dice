import faceStyles from "#/styles/faces.module.css";
import { memo } from "react";

const GEESE_SUCCESS_MIN = 4;

export const DiceRow = memo(
  ({ dice, roundIndex }: { dice: number[]; roundIndex: number }) => {
    return (
      <div className="flex items-center gap-2">
        {roundIndex > 0 && (
          <span className="text-base-content/50 select-none">↳</span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {dice.map((value, i) => (
            <span
              key={i}
              data-degree={value >= GEESE_SUCCESS_MIN ? "success" : "failure"}
              className={faceStyles.face}
            >
              {value}
            </span>
          ))}
        </div>
      </div>
    );
  },
);
DiceRow.displayName = "DiceRow";
