import { Route } from "#/lib/minirouter";
import type { DeckCard } from "../DeckIndividualBacksEditor";
import { CardBackPanel } from "./CardBackPanel";
import { IndividualBackNavRow } from "./IndividualBackNavRow";
import { PairingProposalsPanel } from "./PairingProposalsPanel";
import { PanelBody } from "./PanelBody";
import { PanelFrame } from "./PanelFrame";
import { SettingRow } from "./SettingRow";
import { cardBack, pairingProposals } from "./directions";
import { memo, useMemo } from "react";

/**
 * The Individual Backs panel: one row per Card, each drilling down to its own
 * back picker ({@link CardBackPanel}), plus the "scan names for pairings" panel.
 * The per-Card picker is mounted here as a child route ({@link cardBack}) — a
 * sibling of the list body, so when it is open the list is made inert but keeps
 * its scroll position for the return trip (important for an up-to-78-Card Deck).
 */
export const IndividualBacksPanel = memo(
  ({
    cards,
    disabled,
    onAssign,
    onRemove,
    onApplyProposals,
  }: {
    cards: DeckCard[];
    disabled: boolean;
    onAssign: (frontNodeId: string, backNodeId: string) => void;
    onRemove: (frontNodeId: string) => void;
    onApplyProposals: (
      pairings: { frontNodeId: string; backNodeId: string }[],
    ) => void;
  }) => {
    // A card can back only one other card, so the images offered as a back are
    // the Deck's other cards that are themselves still unbacked. A row drops
    // itself from these; the count tells the row whether drilling down is worth
    // offering.
    const unbackedCards = useMemo(
      () => cards.filter((card) => card.individualBack === null),
      [cards],
    );

    return (
      <PanelFrame slide>
        <PanelBody back>
          <div className="flex flex-col gap-1">
            <span className="px-2 font-medium">Individual backs</span>
            <span className="text-base-content/60 px-2">
              Give a card its own back, shown instead of the common back. The
              chosen image stops being a card in its own right.
            </span>
            {cards.length > 0 && (
              <SettingRow
                label="Propose card pairings"
                summary="Scan image names for matches"
                to={pairingProposals()}
                disabled={disabled}
              />
            )}
            {cards.map((card) => {
              const candidateCount = unbackedCards.filter(
                (candidate) => candidate.nodeId !== card.nodeId,
              ).length;
              return (
                <IndividualBackNavRow
                  key={card.nodeId}
                  card={card}
                  candidateCount={candidateCount}
                  disabled={disabled}
                  onRemove={() => onRemove(card.nodeId)}
                />
              );
            })}
            {cards.length === 0 && (
              <span className="text-base-content/60 p-2">
                This deck has no cards to pair yet.
              </span>
            )}
          </div>
        </PanelBody>
        <Route direction={cardBack}>
          <CardBackPanel
            cards={cards}
            unbackedCards={unbackedCards}
            disabled={disabled}
            onAssign={onAssign}
          />
        </Route>
        <Route direction={pairingProposals}>
          <PairingProposalsPanel
            cards={cards}
            disabled={disabled}
            onApply={onApplyProposals}
          />
        </Route>
      </PanelFrame>
    );
  },
);

IndividualBacksPanel.displayName = "IndividualBacksPanel";
