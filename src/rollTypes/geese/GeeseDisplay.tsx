import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { useUserIdentityContext } from "#/components/DiceRoller/contexts/userIdentityContext";
import { memo, useCallback } from "react";
import faceStyles from "../havoc/faces.module.css";
import type { GeeseFormula, GeeseResult } from "./geeseValidators";

const GEESE_SUCCESS_MIN = 4;

// ── Sub-components ────────────────────────────────────────────────────────────

type DiceRowProps = { dice: number[]; roundIndex: number };

const DiceRow = memo(({ dice, roundIndex }: DiceRowProps) => {
  const successes = dice.filter((v) => v >= GEESE_SUCCESS_MIN).length;
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
      <span className="text-base-content/60 text-xs">
        {successes === 0 ? "—" : successes === 1 ? "1 hit" : `${successes} hits`}
      </span>
    </div>
  );
});
DiceRow.displayName = "DiceRow";

// ── Roll result (with action buttons) ─────────────────────────────────────────

type GeeseRollDisplayProps = {
  result: Extract<GeeseResult, { action: "roll" }>;
};

const GeeseRollDisplay = memo(({ result }: GeeseRollDisplayProps) => {
  const sendMessage = useSendMessageContext();
  const { displayName } = useUserIdentityContext();

  const handleRollMore = useCallback(() => {
    sendMessage({
      type: "chat",
      payload: {
        rollType: "geese",
        formula: JSON.stringify({
          action: "roll",
          numDice: result.explodingCount,
          previousRounds: result.rounds,
        } satisfies GeeseFormula),
        chat: null,
        displayName,
      },
    });
  }, [result.explodingCount, result.rounds, sendMessage, displayName]);

  const handleResolve = useCallback(() => {
    sendMessage({
      type: "chat",
      payload: {
        rollType: "geese",
        formula: JSON.stringify({
          action: "resolve",
          rounds: result.rounds,
          totalSuccesses: result.totalSuccesses,
        } satisfies GeeseFormula),
        chat: null,
        displayName,
      },
    });
  }, [result.rounds, result.totalSuccesses, sendMessage, displayName]);

  const handlePass = useCallback(() => {
    sendMessage({
      type: "chat",
      payload: {
        rollType: "geese",
        formula: JSON.stringify({
          action: "pass",
          rounds: result.rounds,
          totalSuccesses: result.totalSuccesses,
        } satisfies GeeseFormula),
        chat: null,
        displayName,
      },
    });
  }, [result.rounds, result.totalSuccesses, sendMessage, displayName]);

  const { totalSuccesses, explodingCount, rounds } = result;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {rounds.map((round, i) => (
          <DiceRow key={i} dice={round} roundIndex={i} />
        ))}
      </div>

      <div className="text-sm font-semibold">
        {totalSuccesses === 0
          ? "No successes"
          : `${totalSuccesses} success${totalSuccesses === 1 ? "" : "es"} total`}
        {explodingCount > 0 && (
          <span className="text-base-content/60 font-normal">
            {" "}
            &mdash; {explodingCount}{" "}
            {explodingCount === 1 ? "die explodes" : "dice explode"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {explodingCount > 0 && (
          <button onClick={handleRollMore} className="btn btn-primary btn-sm">
            Roll {explodingCount} more {explodingCount === 1 ? "die" : "dice"}
          </button>
        )}
        <button onClick={handleResolve} className="btn btn-success btn-sm">
          Resolve
        </button>
        <button onClick={handlePass} className="btn btn-ghost btn-sm">
          Pass
        </button>
      </div>
    </div>
  );
});
GeeseRollDisplay.displayName = "GeeseRollDisplay";

// ── Resolved / passed result ───────────────────────────────────────────────────

type GeeseDecisionDisplayProps = {
  result: Extract<GeeseResult, { action: "resolve" | "pass" }>;
};

const GeeseDecisionDisplay = memo(({ result }: GeeseDecisionDisplayProps) => {
  const { totalSuccesses, rounds, action } = result;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 opacity-60">
        {rounds.map((round, i) => (
          <DiceRow key={i} dice={round} roundIndex={i} />
        ))}
      </div>
      <div className="text-sm font-semibold">
        {action === "resolve"
          ? `✓ Resolved with ${totalSuccesses} success${totalSuccesses === 1 ? "" : "es"}`
          : "→ Passed"}
      </div>
    </div>
  );
});
GeeseDecisionDisplay.displayName = "GeeseDecisionDisplay";

// ── Root export ───────────────────────────────────────────────────────────────

export const GeeseDisplay = memo(
  ({ result }: { formula: GeeseFormula; result: GeeseResult }) => {
    if (result.action === "roll") {
      return <GeeseRollDisplay result={result} />;
    }
    return <GeeseDecisionDisplay result={result} />;
  },
);
GeeseDisplay.displayName = "GeeseDisplay";
