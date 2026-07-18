import { RotateCcw } from "lucide-react";
import { memo } from "react";

/**
 * The dwindle readout for one Pile: how many Cards remain, plus Reset. Purely
 * presentational — the counts are derived by {@link useRemainingCards} in the
 * parent, which also gates the Draw button on them.
 */
export const DwindleStatus = memo(
  ({
    remaining,
    total,
    onReset,
  }: {
    remaining: number | null;
    total: number | null;
    onReset: () => void;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-base-content/70">
        {remaining === null ? "…" : `${remaining} of ${total ?? 0} left`}
      </span>
      <button
        type="button"
        className="btn btn-sm btn-ghost gap-1"
        onClick={onReset}
      >
        <RotateCcw size={16} />
        Reset
      </button>
    </div>
  ),
);

DwindleStatus.displayName = "DwindleStatus";
