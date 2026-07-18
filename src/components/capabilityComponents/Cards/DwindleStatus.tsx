import { logger } from "#/utils/logger.ts";
import { actions } from "astro:actions";
import { RotateCcw } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

/**
 * The dwindle readout for one Pile: how many Cards remain, plus Reset.
 *
 * Remaining is derived, never stored (ADR-0001 decision 4): we fetch the Deck's
 * live Cards from the one authoritative source (`cards.getDeckCards`, backed by
 * `UserDataDO.getDeckCards`) and subtract the Discard the room already holds in
 * capability state. Re-fetching whenever the Discard changes also picks up Cards
 * the owner has added or deleted since the last draw, so the count stays live
 * without any drift-reconciliation logic.
 */
export const DwindleStatus = memo(
  ({
    ownerUserId,
    deckNodeId,
    roomId,
    discard,
    discardKey,
    onReset,
  }: {
    ownerUserId: string;
    deckNodeId: string;
    roomId: string;
    discard: string[];
    /** Stable string form of `discard`, used as the re-fetch trigger. */
    discardKey: string;
    onReset: () => void;
  }) => {
    const [liveCardIds, setLiveCardIds] = useState<string[] | null>(null);

    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        const result = await actions.cards.getDeckCards({
          ownerUserId,
          deckNodeId,
          roomId,
        });
        if (cancelled) return;
        if (result.error) {
          logger.error("Failed to fetch deck cards", result.error);
          setLiveCardIds(null);
          return;
        }
        setLiveCardIds(result.data.cards.map((card) => card.nodeId));
      };
      void load();
      return () => {
        cancelled = true;
      };
      // `discardKey` (not `discard`) is the dep: the array identity churns every
      // render, the string does not.
    }, [ownerUserId, deckNodeId, roomId, discardKey]);

    const remaining = useMemo(() => {
      if (liveCardIds === null) return null;
      const discarded = new Set(discard);
      return liveCardIds.filter((id) => !discarded.has(id)).length;
    }, [liveCardIds, discard]);

    return (
      <div className="flex items-center gap-2">
        <span className="text-base-content/70">
          {remaining === null
            ? "…"
            : `${remaining} of ${liveCardIds?.length ?? 0} left`}
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
    );
  },
);

DwindleStatus.displayName = "DwindleStatus";
