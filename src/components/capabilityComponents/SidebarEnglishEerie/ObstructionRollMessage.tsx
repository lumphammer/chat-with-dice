import { authClient } from "#/auth/authClient";
import { englisheerieClient } from "#/capabilities/englisheerie/client";
import {
  RESOLVE_BEFORE_BONUS,
  type ObstructionRollMessageData,
} from "#/capabilities/englisheerie/common";
import { DiceRow } from "#/components/capabilityComponents/shared/diceDisplay/DiceRow";
import { FaceChip } from "#/components/capabilityComponents/shared/diceDisplay/FaceChip";
import { FormulaLine } from "#/components/capabilityComponents/shared/diceDisplay/FormulaLine";
import { ResultStat } from "#/components/capabilityComponents/shared/diceDisplay/ResultStat";
import { HeartIcon } from "lucide-react";

interface Props {
  data: ObstructionRollMessageData;
  messageId: string;
  messageUserId: string;
}

function formatFormula(data: ObstructionRollMessageData): string {
  const before =
    data.spentBefore > 0 ? ` + ${data.spentBefore * RESOLVE_BEFORE_BONUS}` : "";
  const after = data.spentAfter > 0 ? ` + ${data.spentAfter}` : "";
  return `d10${before}${after} vs ${data.difficulty}`;
}

export const ObstructionRollMessage = ({
  data,
  messageId,
  messageUserId,
}: Props) => {
  const capInfo = englisheerieClient.useMount();
  const { data: sessionData } = authClient.useSession();

  // The exact shortfall is the only spend worth making: enough to turn the roll,
  // and no more. Offered to the roller alone, and only when they didn't already
  // spend Resolve up front — it's one or the other.
  const shortfall = data.difficulty - data.total;
  const resolveRemaining = capInfo.initialised ? capInfo.state.resolve : 0;
  const onBoost =
    capInfo.initialised &&
    sessionData?.user.id === messageUserId &&
    !data.success &&
    data.spentBefore === 0 &&
    shortfall > 0 &&
    resolveRemaining >= shortfall
      ? () => capInfo.actions.boostRoll({ messageId, spend: shortfall })
      : undefined;
  const cannotSpendMessage =
    !capInfo.initialised || data.success
      ? undefined
      : data.spentBefore > 0
        ? "Cannot spend to succeed: Resolve spent before roll"
        : resolveRemaining < shortfall
          ? "Cannot spend to succeed: insufficient Resolve left"
          : undefined;

  return (
    <div className="flex flex-col gap-1 py-1 group-data-is-mine:items-end">
      <FormulaLine>{formatFormula(data)}</FormulaLine>

      <DiceRow>
        <FaceChip
          value={data.die}
          degree={data.success ? "success" : "failure"}
          ariaLabel={`${data.die} on a d10`}
        />
      </DiceRow>

      <ResultStat label="total" value={data.total} />

      <div
        className={`mt-1 flex items-center gap-2 rounded border p-2 text-sm
          font-semibold ${
            data.success
              ? "bg-success/10 border-success/30 text-success"
              : "bg-error/10 border-error/30 text-error"
          }`}
      >
        <span className="grow text-left">
          {data.success ? "Obstruction beaten" : "The obstruction holds"}
        </span>
        {data.spentAfter > 0 && (
          <span className="badge badge-sm">
            {data.spentAfter} Resolve spent after
          </span>
        )}
        {data.spiritLost && (
          <span className="badge badge-sm">1 Spirit lost</span>
        )}
      </div>

      {onBoost && (
        <button
          type="button"
          className="btn btn-sm btn-outline mt-1 w-max"
          onClick={onBoost}
        >
          <HeartIcon className="h-4 w-4" />
          Spend {shortfall} Resolve to succeed
        </button>
      )}
      {cannotSpendMessage && (
        <span className="text-base-content/50 mt-1 text-xs">
          {cannotSpendMessage}
        </span>
      )}
    </div>
  );
};
