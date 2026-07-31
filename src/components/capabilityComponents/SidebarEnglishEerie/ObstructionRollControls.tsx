import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { RESOLVE_BEFORE_BONUS } from "#/capabilities/englisheerie/common";
import { FormulaLine } from "#/components/capabilityComponents/shared/diceDisplay/FormulaLine";
import { DicesIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

interface Props {
  difficulty: number;
  onRoll?: () => void;
}

export const ObstructionRollControls = ({ difficulty, onRoll }: Props) => {
  const capInfo = englisheerieClient.useMount();
  const [resolveToSpend, setResolveToSpend] = useState(0);

  if (!capInfo.initialised) {
    return null;
  }

  const { resolve } = capInfo.state;
  // Somebody else may have spent Resolve since this was set, so the working
  // value is clamped on the way out rather than held clamped in state.
  const spend = Math.min(resolveToSpend, resolve);
  const bonus = spend * RESOLVE_BEFORE_BONUS;

  return (
    <>
      <p className="text-base-content/70 mt-1 max-w-sm text-sm">
        Roll d10 and equal or beat {difficulty}. Spend Resolve now for +
        {RESOLVE_BEFORE_BONUS} each, or spend it afterwards for +1 each.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-base-content/50 text-xs">Spend now</span>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={spend <= 0}
          onClick={() => setResolveToSpend(spend - 1)}
          aria-label="Spend one less Resolve"
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-lg font-bold tabular-nums">
          {spend}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={spend >= resolve}
          onClick={() => setResolveToSpend(spend + 1)}
          aria-label="Spend one more Resolve"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        <span className="text-base-content/50 text-xs">of {resolve}</span>
      </div>

      <button
        type="button"
        className="btn btn-secondary mt-4 w-full"
        onClick={() => {
          capInfo.actions.rollObstruction({ resolveSpentBefore: spend });
          setResolveToSpend(0);
          onRoll?.();
        }}
      >
        <DicesIcon className="h-5 w-5" />
        Roll d10{bonus > 0 ? ` + ${bonus}` : ""} vs {difficulty}
      </button>
    </>
  );
};
