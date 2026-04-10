import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { useUserIdentityContext } from "#/components/DiceRoller/contexts/userIdentityContext";
import faceStyles from "../havoc/faces.module.css";
import type { GeeseFormula, GeeseResult } from "./geeseValidators";
import styles from "@/styles/inputs.module.css";
import { memo, useCallback, useState, type ChangeEvent } from "react";

const GEESE_SUCCESS_MIN = 4;

// ── Shared sub-component ──────────────────────────────────────────────────────

const DiceRow = memo(
  ({ dice, roundIndex }: { dice: number[]; roundIndex: number }) => {
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
  },
);
DiceRow.displayName = "DiceRow";

// ── Problems display ──────────────────────────────────────────────────────────

const HELL_THRESHOLD = 3;

const PROBLEM_CONSEQUENCES = [
  "you get off scot free",
  "you encounter a new challenge",
  "someone or something important sustains collateral harm",
] as const;

const ProblemsDisplay = memo(({ problemCount }: { problemCount: number }) => {
  const consequence =
    problemCount >= HELL_THRESHOLD
      ? "agents of hell act directly"
      : PROBLEM_CONSEQUENCES[problemCount];
  return (
    <div className="text-warning text-sm">
      {problemCount === 0
        ? "No problems"
        : `${problemCount} problem${problemCount === 1 ? "" : "s"}`}
      {" — "}
      {consequence}
    </div>
  );
});
ProblemsDisplay.displayName = "ProblemsDisplay";

// ── Consumed status label ─────────────────────────────────────────────────────

const ConsumedLabel = memo(
  ({ consumed }: { consumed: "explode" | "resolve" | "pass" }) => {
    const label =
      consumed === "explode"
        ? "→ Exploded"
        : consumed === "resolve"
          ? "✓ Resolved"
          : "→ Passed";
    return (
      <div className="text-base-content/60 text-sm font-medium">{label}</div>
    );
  },
);
ConsumedLabel.displayName = "ConsumedLabel";

// ── Roll action buttons ───────────────────────────────────────────────────────

const RollActionButtons = memo(
  ({
    messageId,
    explodableCount,
    totalSuccesses,
  }: {
    messageId: string;
    explodableCount: number;
    totalSuccesses: number;
  }) => {
    const sendMessage = useSendMessageContext();
    const { displayName } = useUserIdentityContext();

    const handleExplode = useCallback(() => {
      sendMessage({
        type: "chat",
        payload: {
          rollType: "geese",
          formula: {
            action: "explode",
            previousMessageId: messageId,
          } satisfies GeeseFormula,
          chat: null,
          displayName,
        },
      });
    }, [messageId, sendMessage, displayName]);

    const handleResolve = useCallback(() => {
      sendMessage({
        type: "chat",
        payload: {
          rollType: "geese",
          formula: {
            action: "resolve",
            previousMessageId: messageId,
          } satisfies GeeseFormula,
          chat: null,
          displayName,
        },
      });
    }, [messageId, sendMessage, displayName]);

    const handlePass = useCallback(() => {
      sendMessage({
        type: "chat",
        payload: {
          rollType: "geese",
          formula: {
            action: "pass",
            previousMessageId: messageId,
          } satisfies GeeseFormula,
          chat: null,
          displayName,
        },
      });
    }, [messageId, sendMessage, displayName]);

    const canPass = totalSuccesses >= 1;

    return (
      <div className="flex flex-wrap gap-2">
        {explodableCount > 0 && (
          <button onClick={handleExplode} className="btn btn-primary btn-sm">
            Explode {explodableCount} {explodableCount === 1 ? "die" : "dice"}
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
    );
  },
);
RollActionButtons.displayName = "RollActionButtons";

// ── Roll result (with action buttons) ────────────────────────────────────────

const GeeseRollDisplay = memo(
  ({
    result,
    messageId,
  }: {
    result: Extract<GeeseResult, { action: "roll" }>;
    messageId: string;
  }) => {
    const {
      totalSuccesses,
      explodableCount,
      faces,
      consumed,
      previousContributors,
    } = result;
    const { chatId } = useUserIdentityContext();

    const isFaded = consumed != null;
    const isOwner =
      previousContributors.length > 0 &&
      previousContributors[previousContributors.length - 1].chatId === chatId;

    return (
      <div className={`flex flex-col gap-3${isFaded ? " opacity-50" : ""}`}>
        <div className="flex flex-col gap-2">
          {faces.map((round, i) => (
            <DiceRow key={i} dice={round} roundIndex={i} />
          ))}
        </div>
        <div className="text-sm font-semibold">
          {totalSuccesses === 0
            ? "No successes"
            : `${totalSuccesses} success${totalSuccesses === 1 ? "" : "es"} total`}
          {explodableCount > 0 && (
            <span className="text-base-content/60 font-normal">
              {" "}
              &mdash; {explodableCount}{" "}
              {explodableCount === 1 ? "die explodes" : "dice explode"}
            </span>
          )}
        </div>
        {consumed != null ? (
          <ConsumedLabel consumed={consumed} />
        ) : (
          isOwner && (
            <RollActionButtons
              messageId={messageId}
              explodableCount={explodableCount}
              totalSuccesses={totalSuccesses}
            />
          )
        )}
      </div>
    );
  },
);
GeeseRollDisplay.displayName = "GeeseRollDisplay";

// ── Resolve result ────────────────────────────────────────────────────────────

const GeeseResolveDisplay = memo(
  ({ result }: { result: Extract<GeeseResult, { action: "resolve" }> }) => {
    const { totalSuccesses, faces, problemCount } = result;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {faces.map((round, i) => (
            <DiceRow key={i} dice={round} roundIndex={i} />
          ))}
        </div>
        <div className="text-success text-sm font-bold">
          ✓ Resolved with {totalSuccesses} success
          {totalSuccesses === 1 ? "" : "es"}
        </div>
        <ProblemsDisplay problemCount={problemCount} />
      </div>
    );
  },
);
GeeseResolveDisplay.displayName = "GeeseResolveDisplay";

// ── Commit section inside pass display ────────────────────────────────────────

const CommitSection = memo(({ messageId }: { messageId: string }) => {
  const sendMessage = useSendMessageContext();
  const { displayName } = useUserIdentityContext();
  const [numDice, setNumDice] = useState(1);

  const handleNumDiceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setNumDice(Math.max(1, parseInt(e.target.value, 10) || 1));
    },
    [],
  );

  const handleCommit = useCallback(() => {
    sendMessage({
      type: "chat",
      payload: {
        rollType: "geese",
        formula: {
          action: "commit",
          numDice,
          previousMessageId: messageId,
        } satisfies GeeseFormula,
        chat: null,
        displayName,
      },
    });
  }, [numDice, messageId, sendMessage, displayName]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-base-content/60 text-xs">
        Dice to add:
        <input
          type="number"
          min={1}
          value={numDice}
          onChange={handleNumDiceChange}
          className={`${styles.input} w-20 px-2 py-1 text-center text-sm`}
        />
      </label>
      <button onClick={handleCommit} className="btn btn-primary btn-sm">
        Commit
      </button>
    </div>
  );
});
CommitSection.displayName = "CommitSection";

// ── Resolve button for pass owner ─────────────────────────────────────────────

const PassResolveButton = memo(({ messageId }: { messageId: string }) => {
  const sendMessage = useSendMessageContext();
  const { displayName } = useUserIdentityContext();

  const handleResolve = useCallback(() => {
    sendMessage({
      type: "chat",
      payload: {
        rollType: "geese",
        formula: {
          action: "resolve",
          previousMessageId: messageId,
        } satisfies GeeseFormula,
        chat: null,
        displayName,
      },
    });
  }, [messageId, sendMessage, displayName]);

  return (
    <button onClick={handleResolve} className="btn btn-success btn-sm">
      Resolve
    </button>
  );
});
PassResolveButton.displayName = "PassResolveButton";

// ── Pass result (with Commit section) ─────────────────────────────────────────

const GeesePassDisplay = memo(
  ({
    result,
    messageId,
  }: {
    result: Extract<GeeseResult, { action: "pass" }>;
    messageId: string;
  }) => {
    const { chatId } = useUserIdentityContext();
    const {
      faces,
      totalSuccesses,
      problemCount,
      consumed,
      consumedBy,
      previousContributors,
    } = result;

    const isOwner =
      previousContributors.length > 0 &&
      previousContributors[previousContributors.length - 1].chatId === chatId;
    const currentUserContributed = previousContributors.some(
      (c) => c.chatId === chatId,
    );
    const showCommitSection =
      consumedBy == null && consumed == null && !currentUserContributed;

    const isFaded = consumedBy != null || consumed != null;

    return (
      <div className={`flex flex-col gap-3${isFaded ? " opacity-50" : ""}`}>
        <div className="flex flex-col gap-2">
          {faces.map((round, i) => (
            <DiceRow key={i} dice={round} roundIndex={i} />
          ))}
        </div>
        <div className="text-sm font-semibold">
          → Passed &mdash;{" "}
          {totalSuccesses === 0
            ? "no successes to claim"
            : `${totalSuccesses} success${totalSuccesses === 1 ? "" : "es"} to claim`}
        </div>
        <ProblemsDisplay problemCount={problemCount} />
        {consumed === "resolve" ? (
          <div className="text-base-content/60 text-sm font-medium">
            ✓ Resolved
          </div>
        ) : consumedBy != null ? (
          <div className="text-base-content/60 text-sm font-medium">
            Committed by {consumedBy.displayName} ✓
          </div>
        ) : (
          <>
            {isOwner && <PassResolveButton messageId={messageId} />}
            {showCommitSection && <CommitSection messageId={messageId} />}
          </>
        )}
      </div>
    );
  },
);
GeesePassDisplay.displayName = "GeesePassDisplay";

// ── Root export ───────────────────────────────────────────────────────────────

export const GeeseDisplay = memo(
  ({
    result,
    messageId,
  }: {
    formula: GeeseFormula;
    result: GeeseResult;
    messageId: string;
  }) => {
    if (result.action === "roll") {
      return <GeeseRollDisplay result={result} messageId={messageId} />;
    }
    if (result.action === "resolve") {
      return <GeeseResolveDisplay result={result} />;
    }
    return <GeesePassDisplay result={result} messageId={messageId} />;
  },
);
GeeseDisplay.displayName = "GeeseDisplay";
