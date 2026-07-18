import { DeckIndividualBackRow } from "./DeckIndividualBackRow";
import { memo, useMemo, useState } from "react";

export type DeckCard = {
  nodeId: string;
  name: string;
  individualBack: { nodeId: string; name: string } | null;
};

/**
 * The Individual Backs editor of the Deck settings dialog: one row per Card,
 * each letting the owner pair that Card's front with its own back — the back
 * that takes precedence over any Common Back (CONTEXT.md). Broken out so
 * {@link DeckSettingsDialog} stays focused on load/mutation state.
 *
 * Pairing by hand is inherently tedious for a large Deck; this is the foundation
 * a later heuristic (issue #46) proposes pairings on top of, so a Deck whose
 * filenames defeat any heuristic is still fully pairable here.
 *
 * A given image can back only one Card, so the images offered as a back for a
 * Card are the Deck's *other Cards that have no back of their own*. Assigning one
 * as a back removes it from the Card list (it "stops being a Card in its own
 * right"), which also drops it from every other Card's choices. Only one Card's
 * picker is expanded at a time, to keep a 78-Card Deck manageable.
 */
export const DeckIndividualBacksEditor = memo(
  ({
    cards,
    disabled,
    onAssign,
    onRemove,
  }: {
    cards: DeckCard[];
    disabled: boolean;
    onAssign: (frontNodeId: string, backNodeId: string) => void;
    onRemove: (frontNodeId: string) => void;
  }) => {
    const [openFrontId, setOpenFrontId] = useState<string | null>(null);

    // A card can back only one other card, so the images offered as a back are
    // the Deck's other cards that are themselves still unbacked. Memoised so each
    // row receives a stable array (and to satisfy the no-new-array-prop lint);
    // the row drops itself from these choices.
    const unbackedCards = useMemo(
      () => cards.filter((card) => card.individualBack === null),
      [cards],
    );

    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium">Individual backs</span>
        <span className="text-base-content/60">
          Give a card its own back, shown instead of the common back. The chosen
          image stops being a card in its own right.
        </span>
        <div className="mt-2 flex max-h-80 flex-col gap-1 overflow-y-auto">
          {cards.map((card) => (
            <DeckIndividualBackRow
              key={card.nodeId}
              card={card}
              unbackedCards={unbackedCards}
              isOpen={openFrontId === card.nodeId}
              disabled={disabled}
              onToggleOpen={() =>
                setOpenFrontId((current) =>
                  current === card.nodeId ? null : card.nodeId,
                )
              }
              onAssign={(backNodeId) => {
                setOpenFrontId(null);
                onAssign(card.nodeId, backNodeId);
              }}
              onRemove={() => onRemove(card.nodeId)}
            />
          ))}
          {cards.length === 0 && (
            <span className="text-base-content/60 p-2">
              This deck has no cards to pair yet.
            </span>
          )}
        </div>
      </div>
    );
  },
);

DeckIndividualBacksEditor.displayName = "DeckIndividualBacksEditor";
