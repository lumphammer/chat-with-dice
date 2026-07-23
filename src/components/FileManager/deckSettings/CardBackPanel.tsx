import { useNavigationContext, useParams } from "#/lib/minirouter";
import { DeckImageThumbnail } from "../DeckImageThumbnail";
import type { DeckCard } from "../DeckIndividualBacksEditor";
import { PanelBody } from "./PanelBody";
import { PanelFrame } from "./PanelFrame";
import { cardBack } from "./directions";
import { memo } from "react";

/**
 * The per-Card Individual Back picker, reached from a Card's row in the
 * {@link IndividualBacksPanel}. The candidates are the Deck's *other* still-
 * unbacked Cards (an image can back only one Card, and assigning one removes it
 * from the Card list). Picking one assigns it and pops straight back to the list.
 */
export const CardBackPanel = memo(
  ({
    cards,
    unbackedCards,
    disabled,
    onAssign,
  }: {
    cards: DeckCard[];
    unbackedCards: DeckCard[];
    disabled: boolean;
    onAssign: (frontNodeId: string, backNodeId: string) => void;
  }) => {
    const { navigate } = useNavigationContext();
    const frontNodeId = useParams(cardBack);
    const card = cards.find((c) => c.nodeId === frontNodeId);
    const candidates = unbackedCards.filter(
      (candidate) => candidate.nodeId !== frontNodeId,
    );

    const handlePick = (backNodeId: string) => {
      // Pop back to the list first so the UI returns immediately; the assign
      // (and its reload) then lands on the list the owner is already looking at.
      navigate("here", "up");
      onAssign(frontNodeId, backNodeId);
    };

    return (
      <PanelFrame slide>
        <PanelBody back>
          <div className="flex flex-col gap-1">
            <span className="px-2 font-medium">
              Set back for {card?.name ?? "card"}
            </span>
            <span className="text-base-content/60 px-2">
              Pick an image to show as this card&rsquo;s back. It stops being a
              card in its own right.
            </span>
            {candidates.map((candidate) => (
              <button
                key={candidate.nodeId}
                type="button"
                className="hover:bg-base-200 mt-1 flex cursor-pointer
                  items-center gap-3 rounded-lg p-2 text-left"
                disabled={disabled}
                onClick={() => handlePick(candidate.nodeId)}
              >
                <DeckImageThumbnail nodeId={candidate.nodeId} />
                <span className="min-w-0 flex-1 truncate">
                  {candidate.name}
                </span>
              </button>
            ))}
            {candidates.length === 0 && (
              <span className="text-base-content/60 p-2">
                No free images left to use as a back.
              </span>
            )}
          </div>
        </PanelBody>
      </PanelFrame>
    );
  },
);

CardBackPanel.displayName = "CardBackPanel";
