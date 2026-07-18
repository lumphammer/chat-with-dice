import { logger } from "#/utils/logger.ts";
import { actions } from "astro:actions";
import { useEffect, useMemo, useState } from "react";

/**
 * Live remaining/total Card counts for a dwindling Pile.
 *
 * Remaining is derived, never stored (ADR-0001 decision 4): we fetch the Deck's
 * live Cards from the one authoritative source (`cards.getDeckCards`, backed by
 * `UserDataDO.getDeckCards`) and subtract the Discard the room already holds in
 * capability state. Re-fetching whenever the Discard changes also picks up Cards
 * the owner has added or deleted since the last draw, so the count stays live
 * without any drift-reconciliation logic.
 *
 * Only fetches while `enabled` (the Pile is dwindling); a non-dwindling Pile has
 * no meaningful "remaining". Counts are `null` until the first fetch resolves,
 * or if it fails.
 */
export function useRemainingCards({
  ownerUserId,
  deckNodeId,
  roomId,
  discard,
  discardKey,
  enabled,
}: {
  ownerUserId: string;
  deckNodeId: string;
  roomId: string;
  discard: string[];
  /** Stable string form of `discard`, used as the re-fetch trigger. */
  discardKey: string;
  enabled: boolean;
}): { remaining: number | null; total: number | null } {
  const [liveCardIds, setLiveCardIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLiveCardIds(null);
      return;
    }
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
  }, [enabled, ownerUserId, deckNodeId, roomId, discardKey]);

  const remaining = useMemo(() => {
    if (liveCardIds === null) return null;
    const discarded = new Set(discard);
    return liveCardIds.filter((id) => !discarded.has(id)).length;
  }, [liveCardIds, discard]);

  return { remaining, total: liveCardIds?.length ?? null };
}
