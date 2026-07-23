import type { DeckCard } from "./DeckIndividualBacksEditor";
import { DeckPairingProposalRow } from "./DeckPairingProposalRow";
import { proposeIndividualBackPairings } from "./proposeIndividualBackPairings";
import { memo, useMemo, useState } from "react";

/**
 * The body of the "propose card pairings" panel (issue #46): proposes
 * front→Individual Back pairings from Card Image names, for the owner to review
 * and apply — proposals are never applied silently, since a wrong auto-pairing
 * nobody saw is worse than no pairing.
 *
 * The scan runs as soon as the panel opens (there is no separate "scan" button —
 * scanning is the whole point of the panel), and re-opening it re-scans from
 * scratch. Proposals are computed only from the Deck's *unpaired* Cards, so a
 * scan never touches a pairing the owner already made or corrected by hand, and
 * re-opening after applying some simply finds whatever is still unpaired. A Deck
 * the heuristic cannot crack yields no proposals and is left entirely to the
 * hand-pairing rows on the Individual Backs list.
 *
 * Applying hands the accepted proposals up to the parent, which writes them via
 * the same server action as hand-pairing — the store re-validates every pairing,
 * so this panel only ever *suggests*.
 */
export const DeckPairingProposals = memo(
  ({
    cards,
    disabled,
    onApply,
  }: {
    cards: DeckCard[];
    disabled: boolean;
    onApply: (pairings: { frontNodeId: string; backNodeId: string }[]) => void;
  }) => {
    const [dismissed, setDismissed] = useState<ReadonlySet<string>>(
      () => new Set(),
    );

    // Only unpaired Cards are candidates, so accepting proposals never disturbs
    // an existing pairing. Memoised so the row list gets a stable array.
    const proposals = useMemo(() => {
      const unpaired = cards.filter((card) => card.individualBack === null);
      return proposeIndividualBackPairings(unpaired);
    }, [cards]);

    const visibleProposals = useMemo(
      () =>
        proposals.filter((proposal) => !dismissed.has(proposal.front.nodeId)),
      [proposals, dismissed],
    );

    const handleApply = () => {
      onApply(
        visibleProposals.map((proposal) => ({
          frontNodeId: proposal.front.nodeId,
          backNodeId: proposal.back.nodeId,
        })),
      );
    };

    const handleDismiss = (frontNodeId: string) => {
      setDismissed((previous) => {
        const next = new Set(previous);
        next.add(frontNodeId);
        return next;
      });
    };

    if (visibleProposals.length === 0) {
      return (
        <div className="flex flex-col gap-2">
          <span className="px-2 font-medium">Propose card pairings</span>
          <span className="text-base-content/60 px-2">
            No pairings found from card image names. Pair them by hand from the
            list.
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {/* The Apply action is pinned to the top of the panel's scroller so it
            stays reachable however far down the review list the owner scrolls.
            z-10 keeps it above the rows that scroll behind it. */}
        <div
          className="bg-base-100 border-base-300 sticky top-0 z-10 flex
            items-center gap-2 border-b px-2 py-2"
        >
          <span className="min-w-0 flex-1 font-medium">
            Propose card pairings
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm shrink-0"
            disabled={disabled}
            onClick={handleApply}
          >
            Apply {visibleProposals.length}{" "}
            {visibleProposals.length === 1 ? "pairing" : "pairings"}
          </button>
        </div>
        <span className="text-base-content/60 px-2">
          Proposed from card image names — review, then apply. Nothing is
          changed until you do.
        </span>
        <div className="flex flex-col gap-1">
          {visibleProposals.map((proposal) => (
            <DeckPairingProposalRow
              key={proposal.front.nodeId}
              proposal={proposal}
              disabled={disabled}
              onDismiss={() => handleDismiss(proposal.front.nodeId)}
            />
          ))}
        </div>
      </div>
    );
  },
);

DeckPairingProposals.displayName = "DeckPairingProposals";
