import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { authClient } from "#/utils/auth-client";
import type { HonkD6Formula, HonkD6Result } from "../honkD6Validators";
import { DiceRow } from "./DiceRow";
import { HonkD6PassDisplay } from "./HonkD6PassDisplay";
import { ProblemsDisplay } from "./ProblemsDisplay";
import { SchemeHeader } from "./SchemeHeader";
import { memo, useCallback } from "react";

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
    const { data: sessionData } = authClient.useSession();
    const sendMessage = useSendMessageContext();

    const handleExplode = useCallback(() => {
      if (sessionData === null) {
        return;
      }
      sendMessage({
        type: "chat",
        payload: {
          rollType: "honkD6",
          formula: {
            action: "explode",
            previousMessageId: messageId,
          } satisfies HonkD6Formula,
          chat: null,
          displayName: sessionData.user.name,
        },
      });
    }, [messageId, sendMessage, sessionData]);

    const handleResolve = useCallback(() => {
      if (sessionData === null) {
        return;
      }
      sendMessage({
        type: "chat",
        payload: {
          rollType: "honkD6",
          formula: {
            action: "resolve",
            previousMessageId: messageId,
          } satisfies HonkD6Formula,
          chat: null,
          displayName: sessionData.user.name,
        },
      });
    }, [messageId, sendMessage, sessionData]);

    const handlePass = useCallback(() => {
      if (sessionData === null) {
        return;
      }
      sendMessage({
        type: "chat",
        payload: {
          rollType: "honkD6",
          formula: {
            action: "pass",
            previousMessageId: messageId,
          } satisfies HonkD6Formula,
          chat: null,
          displayName: sessionData.user.name,
        },
      });
    }, [messageId, sendMessage, sessionData]);

    const canPass = totalSuccesses > 1;

    return (
      <div className="flex flex-wrap gap-2">
        {explodableCount > 0 && (
          <button onClick={handleExplode} className="btn btn-primary btn-sm">
            Explode {explodableCount} more{" "}
            {explodableCount === 1 ? "die" : "dice"}
          </button>
        )}
        <button onClick={handleResolve} className="btn btn-success btn-sm">
          Resolve with {totalSuccesses} success
          {totalSuccesses === 1 ? "" : "es"}
        </button>
        {canPass && (
          <button
            onClick={handlePass}
            disabled={!canPass}
            className="btn btn-secondary btn-sm"
          >
            Pass {totalSuccesses - 1} successes
          </button>
        )}
      </div>
    );
  },
);
RollActionButtons.displayName = "RollActionButtons";

// ── Roll result (with action buttons) ────────────────────────────────────────

const HonkD6RollDisplay = memo(
  ({
    result,
    messageId,
    formulaAction,
  }: {
    result: Extract<HonkD6Result, { action: "roll" }>;
    messageId: string;
    formulaAction: "start" | "explode" | "commit";
  }) => {
    const {
      totalSuccesses,
      explodableCount,
      faces,
      consumed,
      previousContributors,
      schemeDescription,
    } = result;
    const { data: sessionData } = authClient.useSession();
    const userId = sessionData?.user.id;
    const isFaded = consumed != null;
    const isOwner =
      previousContributors.length > 0 &&
      previousContributors[previousContributors.length - 1].chatId === userId;
    const ownerName = previousContributors[0]?.displayName ?? "Unknown";
    const actorName =
      previousContributors[previousContributors.length - 1]?.displayName ??
      "Unknown";

    return (
      <div className={`flex flex-col gap-3${isFaded ? "opacity-50" : ""}`}>
        <SchemeHeader
          schemeDescription={schemeDescription}
          ownerName={ownerName}
          actorName={actorName}
          formulaAction={formulaAction}
        />
        <div className="flex flex-col gap-2">
          {faces.map((round, i) => (
            <DiceRow key={i} dice={round} roundIndex={i} />
          ))}
        </div>
        {/*<div className="text-sm font-semibold">
          {totalSuccesses === 0
            ? "No successes"
            : `${totalSuccesses} success${totalSuccesses === 1 ? "" : "es"} total`}
        </div>*/}
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
HonkD6RollDisplay.displayName = "HonkD6RollDisplay";

// ── Resolve result ────────────────────────────────────────────────────────────

const HonkD6ResolveDisplay = memo(
  ({ result }: { result: Extract<HonkD6Result, { action: "resolve" }> }) => {
    const {
      totalSuccesses,
      faces,
      problemCount,
      previousContributors,
      schemeDescription,
    } = result;
    const ownerName = previousContributors[0]?.displayName ?? "Unknown";
    const actorName =
      previousContributors[previousContributors.length - 1]?.displayName ??
      "Unknown";
    return (
      <div className="flex flex-col gap-3">
        <SchemeHeader
          schemeDescription={schemeDescription}
          ownerName={ownerName}
          actorName={actorName}
          formulaAction="resolve"
        />
        <div className="flex flex-col gap-2">
          {faces.map((round, i) => (
            <DiceRow key={i} dice={round} roundIndex={i} />
          ))}
        </div>
        <div className="text-success-text font-bold">
          ✓ Resolved with {totalSuccesses} success
          {totalSuccesses === 1 ? "" : "es"}
        </div>
        <ProblemsDisplay problemCount={problemCount} />
      </div>
    );
  },
);
HonkD6ResolveDisplay.displayName = "HonkD6ResolveDisplay";

// ── Root export ───────────────────────────────────────────────────────────────

export const HonkD6Display = memo(
  ({
    formula,
    result,
    messageId,
  }: {
    formula: HonkD6Formula;
    result: HonkD6Result;
    messageId: string;
  }) => {
    if (result.action === "roll") {
      return (
        <HonkD6RollDisplay
          result={result}
          messageId={messageId}
          formulaAction={formula.action as "start" | "explode" | "commit"}
        />
      );
    }
    if (result.action === "resolve") {
      return <HonkD6ResolveDisplay result={result} />;
    }
    return <HonkD6PassDisplay result={result} messageId={messageId} />;
  },
);
HonkD6Display.displayName = "HonkD6Display";
