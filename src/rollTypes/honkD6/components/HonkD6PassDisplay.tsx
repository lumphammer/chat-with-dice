import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { useUserInfoContext } from "#/components/DiceRoller/contexts/userInfoContext";
import type { HonkD6Formula, HonkD6Result } from "../honkD6Validators";
import { DiceRow } from "./DiceRow";
import { ProblemsDisplay } from "./ProblemsDisplay";
import { SchemeHeader } from "./SchemeHeader";
import styles from "@/styles/inputs.module.css";
import { memo, useCallback, useState, type ChangeEvent } from "react";

// ── Commit section inside pass display ────────────────────────────────────────

const CommitSection = memo(({ messageId }: { messageId: string }) => {
  const sendMessage = useSendMessageContext();
  const { displayName } = useUserInfoContext();
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
        rollType: "honkD6",
        formula: {
          action: "commit",
          numDice,
          previousMessageId: messageId,
        } satisfies HonkD6Formula,
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

const PassResolveButton = memo(
  ({
    messageId,
    totalSuccesses,
  }: {
    messageId: string;
    totalSuccesses: number;
  }) => {
    const sendMessage = useSendMessageContext();
    const { displayName } = useUserInfoContext();

    const handleResolve = useCallback(() => {
      sendMessage({
        type: "chat",
        payload: {
          rollType: "honkD6",
          formula: {
            action: "resolve",
            previousMessageId: messageId,
          } satisfies HonkD6Formula,
          chat: null,
          displayName,
        },
      });
    }, [messageId, sendMessage, displayName]);

    return (
      <button onClick={handleResolve} className="btn btn-success btn-sm">
        Resolve anyway with {totalSuccesses} success
      </button>
    );
  },
);
PassResolveButton.displayName = "PassResolveButton";

// ── Pass result (with Commit section) ─────────────────────────────────────────

export const HonkD6PassDisplay = memo(
  ({
    result,
    messageId,
  }: {
    result: Extract<HonkD6Result, { action: "pass" }>;
    messageId: string;
  }) => {
    const { chatId } = useUserInfoContext();
    const {
      faces,
      totalSuccesses,
      problemCount,
      consumed,
      consumedBy,
      previousContributors,
      schemeDescription,
    } = result;
    const ownerName = previousContributors[0]?.displayName ?? "Unknown";
    const actorName =
      previousContributors[previousContributors.length - 1]?.displayName ??
      "Unknown";

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
      <div className={`flex flex-col gap-3${isFaded ? "opacity-50" : ""}`}>
        <SchemeHeader
          schemeDescription={schemeDescription}
          ownerName={ownerName}
          actorName={actorName}
          formulaAction="pass"
        />
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
            {isOwner && (
              <PassResolveButton
                messageId={messageId}
                totalSuccesses={result.totalSuccesses}
              />
            )}
            {showCommitSection && <CommitSection messageId={messageId} />}
          </>
        )}
      </div>
    );
  },
);
HonkD6PassDisplay.displayName = "HonkD6PassDisplay";
