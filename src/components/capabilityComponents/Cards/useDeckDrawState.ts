import { logger } from "#/utils/logger.ts";
import { actions } from "astro:actions";
import { useEffect, useMemo, useState } from "react";

/**
 * A shared Deck's draw state for this Room: whether its drawn Cards go to the
 * Discard, and — when they do — how many Cards remain.
 *
 * Both come from the same call. `drawToDiscardPile` is Deck configuration living
 * in the owner's file store (ADR-0001 decision 6, as amended), so unlike the
 * Discard it is not in room state and has to be fetched. Remaining is derived,
 * never stored (decision 4): we fetch the Deck's live Cards from the one
 * authoritative source (`cards.getDeckCards`, backed by `UserDataDO.getDeck
 * Cards`) and subtract the Discard the room already holds in capability state.
 *
 * The fetch is keyed on `discardKey` and `refreshKey`. Re-fetching whenever the
 * Discard changes picks up Cards the owner has added or deleted since the last
 * draw, so the count stays live without any drift-reconciliation logic — and it
 * is also what converges another participant's sidebar after the owner changes
 * the rule, since every draw moves the Discard for everyone. `refreshKey` is the
 * owner's own shortcut: bumping it after closing Deck settings shows their
 * change immediately rather than at the next draw.
 *
 * `drawToDiscardPile` is `null` until the first fetch resolves, or if it fails;
 * callers should treat that as "not yet known" rather than as either rule. The
 * counts are `null` on the same terms.
 */
export function useDeckDrawState({
  ownerUserId,
  deckNodeId,
  roomId,
  discard,
  discardKey,
  refreshKey,
}: {
  ownerUserId: string;
  deckNodeId: string;
  roomId: string;
  discard: string[];
  /** Stable string form of `discard`, used as the re-fetch trigger. */
  discardKey: string;
  /** Bumped by the caller to force a re-fetch (e.g. Deck settings closed). */
  refreshKey: number;
}): {
  drawToDiscardPile: boolean | null;
  remaining: number | null;
  total: number | null;
} {
  const [liveCardIds, setLiveCardIds] = useState<string[] | null>(null);
  const [drawToDiscardPile, setDrawToDiscardPile] = useState<boolean | null>(
    null,
  );

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
        setDrawToDiscardPile(null);
        return;
      }
      setLiveCardIds(result.data.cards.map((card) => card.nodeId));
      setDrawToDiscardPile(result.data.drawToDiscardPile);
    };
    void load();
    return () => {
      cancelled = true;
    };
    // `discardKey` (not `discard`) is the dep: the array identity churns every
    // render, the string does not. It's a trigger rather than something the
    // effect reads, hence the extra-dependency exemption.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [ownerUserId, deckNodeId, roomId, discardKey, refreshKey]);

  const remaining = useMemo(() => {
    if (liveCardIds === null) return null;
    const discarded = new Set(discard);
    return liveCardIds.filter((id) => !discarded.has(id)).length;
  }, [liveCardIds, discard]);

  return { drawToDiscardPile, remaining, total: liveCardIds?.length ?? null };
}
