import { TriangleAlertIcon } from "lucide-react";
import { memo } from "react";

const triangle = (
  <TriangleAlertIcon
    className="text-warning-text text-shadow-warning-text text-shadow h-8 w-8"
  />
);

export const ProblemsDisplay = memo(
  ({ problemCount }: { problemCount: number }) => {
    return (
      <div className="flex w-full flex-row items-center gap-2 text-sm">
        {problemCount === 0 ? (
          <>No problems &ndash; you get off scot free</>
        ) : problemCount === 1 ? (
          <>
            {triangle}
            <span>1 problem &ndash; you encounter a new challenge.</span>
          </>
        ) : problemCount === 2 ? (
          <>
            {triangle}
            {triangle}
            <span>
              2 problems &ndash; someone or something important sustains
              collateral harm.
            </span>
          </>
        ) : (
          <>
            {triangle}
            {triangle}
            {triangle}
            <span>3+ problems &ndash; agents of hell act directly.</span>
          </>
        )}
      </div>
    );
  },
);
ProblemsDisplay.displayName = "ProblemsDisplay";
