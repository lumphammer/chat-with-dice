import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { useUserIdentityContext } from "#/components/DiceRoller/contexts/userIdentityContext";
import type { GeeseFormula, GeeseResult } from "../geeseValidators";
import { DiceRow } from "./DiceRow";
import { GeesePassDisplay } from "./GeesePassDisplay";
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

const GeeseRollDisplay = memo(
  ({
    result,
    messageId,
    formulaAction,
  }: {
    result: Extract<GeeseResult, { action: "roll" }>;
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
    const { chatId } = useUserIdentityContext();

    const isFaded = consumed != null;
    const isOwner =
      previousContributors.length > 0 &&
      previousContributors[previousContributors.length - 1].chatId === chatId;
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
GeeseRollDisplay.displayName = "GeeseRollDisplay";

// ── Resolve result ────────────────────────────────────────────────────────────

const GeeseResolveDisplay = memo(
  ({ result }: { result: Extract<GeeseResult, { action: "resolve" }> }) => {
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
GeeseResolveDisplay.displayName = "GeeseResolveDisplay";

// ── Root export ───────────────────────────────────────────────────────────────

export const GeeseDisplay = memo(
  ({
    formula,
    result,
    messageId,
  }: {
    formula: GeeseFormula;
    result: GeeseResult;
    messageId: string;
  }) => {
    if (result.action === "roll") {
      return (
        <GeeseRollDisplay
          result={result}
          messageId={messageId}
          formulaAction={formula.action as "start" | "explode" | "commit"}
        />
      );
    }
    if (result.action === "resolve") {
      return <GeeseResolveDisplay result={result} />;
    }
    return <GeesePassDisplay result={result} messageId={messageId} />;
  },
);
GeeseDisplay.displayName = "GeeseDisplay";
