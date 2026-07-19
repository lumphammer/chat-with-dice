import type { DeckCard } from "./DeckIndividualBacksEditor";
import { DeckPairingProposalRow } from "./DeckPairingProposalRow";
import { proposeIndividualBackPairings } from "./proposeIndividualBackPairings";
import { Sparkles } from "lucide-react";
import { memo, useMemo, useState } from "react";

/**
 * The "scan for pairings" panel of the Individual Backs editor (issue #46):
 * proposes front→Individual Back pairings from Card Image names, for the owner to
 * review and apply — proposals are never applied silently, since a wrong
 * auto-pairing nobody saw is worse than no pairing.
 *
 * Proposals are computed only from the Deck's *unpaired* Cards, so scanning never
 * touches a pairing the owner already made or corrected by hand, and re-scanning
 * after applying some simply finds whatever is still unpaired. A Deck the
 * heuristic cannot crack yields no proposals and is left entirely to the
 * hand-pairing rows below this panel.
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
    const [scanned, setScanned] = useState(false);
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

    const handleScan = () => {
      setDismissed(new Set());
      setScanned(true);
    };

    const handleApply = () => {
      onApply(
        visibleProposals.map((proposal) => ({
          frontNodeId: proposal.front.nodeId,
          backNodeId: proposal.back.nodeId,
        })),
      );
      // Collapse the panel; the parent reloads the Card list, and a fresh scan
      // will surface anything still unpaired.
      setScanned(false);
      setDismissed(new Set());
    };

    const handleDismiss = (frontNodeId: string) => {
      setDismissed((previous) => {
        const next = new Set(previous);
        next.add(frontNodeId);
        return next;
      });
    };

    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm self-start"
          disabled={disabled}
          onClick={handleScan}
        >
          <Sparkles size={16} />
          Scan names for pairings
        </button>

        {scanned && visibleProposals.length === 0 && (
          <span className="text-base-content/60">
            No pairings found from card image names. Pair by hand below.
          </span>
        )}

        {scanned && visibleProposals.length > 0 && (
          <div
            className="border-base-300 flex flex-col gap-2 rounded-lg border
              p-2"
          >
            <span className="text-base-content/60">
              Proposed from card image names — review, then apply. Nothing is
              changed until you do.
            </span>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {visibleProposals.map((proposal) => (
                <DeckPairingProposalRow
                  key={proposal.front.nodeId}
                  proposal={proposal}
                  disabled={disabled}
                  onDismiss={() => handleDismiss(proposal.front.nodeId)}
                />
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm self-start"
              disabled={disabled}
              onClick={handleApply}
            >
              Apply {visibleProposals.length}{" "}
              {visibleProposals.length === 1 ? "pairing" : "pairings"}
            </button>
          </div>
        )}
      </div>
    );
  },
);

DeckPairingProposals.displayName = "DeckPairingProposals";
