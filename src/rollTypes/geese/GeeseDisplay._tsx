import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { useUserIdentityContext } from "#/components/DiceRoller/contexts/userIdentityContext";
import faceStyles from "../havoc/faces.module.css";
import type { GeeseFormula, GeeseResult } from "./geeseValidators";
import styles from "@/styles/inputs.module.css";
import { memo, useCallback, useState } from "react";

const GEESE_SUCCESS_MIN = 4;

// ── Shared sub-component ──────────────────────────────────────────────────────

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
        {successes === 0
          ? "—"
          : successes === 1
            ? "1 hit"
            : `${successes} hits`}
      </span>
    </div>
  );
});
DiceRow.displayName = "DiceRow";

// ── Roll result (with action buttons) ────────────────────────────────────────

type GeeseRollDisplayProps = {
  result: Extract<GeeseResult, { action: "roll" }>;
};

const GeeseRollDisplay = memo(({ result }: GeeseRollDisplayProps) => {
  const sendMessage = useSendMessageContext();
  const { displayName, chatId } = useUserIdentityContext();

  const handleRollMore = useCallback(() => {
    sendMessage({
      type: "chat",
      payload: {
        rollType: "geese",
        formula: JSON.stringify({
          action: "roll",
          numDice: result.explodingCount,
          previousRounds: result.rounds,
          inheritedSuccesses: result.inheritedSuccesses,
        } satisfies GeeseFormula),
        chat: null,
        displayName,
      },
    });
  }, [
    result.explodingCount,
    result.rounds,
    result.inheritedSuccesses,
    sendMessage,
    displayName,
  ]);

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
          rollerChatId: chatId,
        } satisfies GeeseFormula),
        chat: null,
        displayName,
      },
    });
  }, [result.rounds, result.totalSuccesses, chatId, sendMessage, displayName]);

  const { totalSuccesses, explodingCount, rounds, inheritedSuccesses } = result;
  const canPass = totalSuccesses >= 1;

  return (
    <div className="flex flex-col gap-3">
      {inheritedSuccesses > 0 && (
        <div className="text-base-content/60 text-xs">
          Starting with {inheritedSuccesses} inherited success
          {inheritedSuccesses === 1 ? "" : "es"}
        </div>
      )}
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
        <button
          onClick={handlePass}
          disabled={!canPass}
          className="btn btn-ghost btn-sm"
        >
          Pass
        </button>
      </div>
    </div>
  );
});
GeeseRollDisplay.displayName = "GeeseRollDisplay";

// ── Resolve result ────────────────────────────────────────────────────────────

type GeeseResolveDisplayProps = {
  result: Extract<GeeseResult, { action: "resolve" }>;
};

const GeeseResolveDisplay = memo(({ result }: GeeseResolveDisplayProps) => {
  const { totalSuccesses, rounds } = result;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 opacity-60">
        {rounds.map((round, i) => (
          <DiceRow key={i} dice={round} roundIndex={i} />
        ))}
      </div>
      <div className="text-sm font-semibold">
        ✓ Resolved with {totalSuccesses} success
        {totalSuccesses === 1 ? "" : "es"}
      </div>
    </div>
  );
});
GeeseResolveDisplay.displayName = "GeeseResolveDisplay";

// ── Pass result (with Commit button) ─────────────────────────────────────────

type GeesePassDisplayProps = {
  result: Extract<GeeseResult, { action: "pass" }>;
};

const GeesePassDisplay = memo(({ result }: GeesePassDisplayProps) => {
  const sendMessage = useSendMessageContext();
  const { displayName, chatId } = useUserIdentityContext();
  const [numDice, setNumDice] = useState(1);
  const [hasCommitted, setHasCommitted] = useState(false);

  const { rounds, passedSuccesses, rollerChatId } = result;

  const isOriginalRoller = rollerChatId === chatId;
  const commitDisabled = isOriginalRoller || hasCommitted;

  const handleCommit = useCallback(() => {
    if (commitDisabled) return;
    sendMessage({
      type: "chat",
      payload: {
        rollType: "geese",
        formula: JSON.stringify({
          action: "roll",
          numDice,
          previousRounds: [],
          inheritedSuccesses: passedSuccesses,
        } satisfies GeeseFormula),
        chat: null,
        displayName,
      },
    });
    setHasCommitted(true);
  }, [commitDisabled, numDice, passedSuccesses, sendMessage, displayName]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 opacity-60">
        {rounds.map((round, i) => (
          <DiceRow key={i} dice={round} roundIndex={i} />
        ))}
      </div>
      <div className="text-sm font-semibold">
        → Passed &mdash;{" "}
        {passedSuccesses === 0
          ? "no successes to claim"
          : `${passedSuccesses} success${passedSuccesses === 1 ? "" : "es"} to claim`}
      </div>
      {passedSuccesses > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-base-content/60 text-xs">
            Dice to add:
            <input
              type="number"
              min={1}
              value={numDice}
              disabled={commitDisabled}
              onChange={(e) =>
                setNumDice(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className={`${styles.input} w-20 px-2 py-1 text-center text-sm`}
            />
          </label>
          <button
            disabled={commitDisabled}
            onClick={handleCommit}
            className="btn btn-primary btn-sm"
          >
            {hasCommitted ? "Committed ✓" : "Commit"}
          </button>
        </div>
      )}
    </div>
  );
});
GeesePassDisplay.displayName = "GeesePassDisplay";

// ── Root export ───────────────────────────────────────────────────────────────

export const GeeseDisplay = memo(
  ({ result }: { formula: GeeseFormula; result: GeeseResult }) => {
    if (result.action === "roll") {
      return <GeeseRollDisplay result={result} />;
    }
    if (result.action === "resolve") {
      return <GeeseResolveDisplay result={result} />;
    }
    return <GeesePassDisplay result={result} />;
  },
);
GeeseDisplay.displayName = "GeeseDisplay";
