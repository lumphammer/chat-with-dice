import { useNavigationContext } from "#/lib/minirouter";
import type { DeckCard } from "../DeckIndividualBacksEditor";
import { DeckPairingProposals } from "../DeckPairingProposals";
import { PanelBody } from "./PanelBody";
import { PanelFrame } from "./PanelFrame";
import { memo } from "react";

/**
 * The "propose card pairings" panel, reached from the {@link IndividualBacksPanel}.
 * Scanning the Card Image names for matches produces a review list that used to
 * sit inline — its own scroller nested inside the list's. On its own panel the
 * proposals get the single body scroller to themselves. It scans on open, and
 * applying pops straight back to the list to show the result.
 */
export const PairingProposalsPanel = memo(
  ({
    cards,
    disabled,
    onApply,
  }: {
    cards: DeckCard[];
    disabled: boolean;
    onApply: (pairings: { frontNodeId: string; backNodeId: string }[]) => void;
  }) => {
    const { navigate } = useNavigationContext();

    const handleApply = (
      pairings: { frontNodeId: string; backNodeId: string }[],
    ) => {
      // Pop back to the list first so the applied pairings land on the list the
      // owner is already looking at (as the per-card picker does).
      navigate("here", "up");
      onApply(pairings);
    };

    return (
      <PanelFrame slide>
        <PanelBody back>
          <DeckPairingProposals
            cards={cards}
            disabled={disabled}
            onApply={handleApply}
          />
        </PanelBody>
      </PanelFrame>
    );
  },
);

PairingProposalsPanel.displayName = "PairingProposalsPanel";
