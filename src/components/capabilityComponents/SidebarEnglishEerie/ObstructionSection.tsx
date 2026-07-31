import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { RESOLVE_BEFORE_BONUS } from "#/capabilities/englisheerie/common";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { FormulaLine } from "#/components/capabilityComponents/shared/diceDisplay/FormulaLine";
import { DicesIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

export const ObstructionSection = () => {
  const capInfo = englisheerieClient.useMount();
  const closeMobileSidebar = useCloseMobileSidebar();
  const [resolveToSpend, setResolveToSpend] = useState(0);

  if (!capInfo.initialised) {
    return null;
  }

  const { lastObstruction, resolve } = capInfo.state;
  const { actions } = capInfo;

  if (!lastObstruction) {
    return (
      <section className="mt-8">
        <h3 className="heading">The Obstruction</h3>
        <p className="text-base-content/70 mt-1 text-sm">
          Nothing to beat yet. Draw a card that obstructs and its difficulty
          lands here.
        </p>
      </section>
    );
  }

  // Somebody else may have spent Resolve since this was set, so the working
  // value is clamped on the way out rather than held clamped in state.
  const spend = Math.min(resolveToSpend, resolve.current);
  const bonus = spend * RESOLVE_BEFORE_BONUS;

  return (
    <section className="mt-8">
      <h3 className="heading">The Obstruction</h3>
      <p className="text-base-content/70 mt-1 text-sm">
        Roll a d10 and equal or beat{" "}
        <strong className="text-base-content">
          {lastObstruction.difficulty}
        </strong>
        . Spend Resolve now for +{RESOLVE_BEFORE_BONUS} each, or spend it on the
        roll afterwards for +1 each — never both.
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
          disabled={spend >= resolve.current}
          onClick={() => setResolveToSpend(spend + 1)}
          aria-label="Spend one more Resolve"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        <span className="text-base-content/50 text-xs">
          of {resolve.current}
        </span>
      </div>

      <div className="mt-2">
        <FormulaLine>
          d10{bonus > 0 ? ` + ${bonus}` : ""} vs {lastObstruction.difficulty}
        </FormulaLine>
      </div>

      <button
        type="button"
        className="btn btn-secondary mt-4 w-full"
        onClick={() => {
          actions.rollObstruction({ resolveSpentBefore: spend });
          setResolveToSpend(0);
          closeMobileSidebar();
        }}
      >
        <DicesIcon className="h-5 w-5" />
        Roll d10
      </button>
    </section>
  );
};
