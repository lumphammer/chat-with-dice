import { DeckImageThumbnail } from "./DeckImageThumbnail";
import type { DeckCard } from "./DeckIndividualBacksEditor";
import { ArrowRight, Plus, X } from "lucide-react";
import { memo } from "react";

/**
 * One Card's row in the {@link DeckIndividualBacksEditor}: the front on the
 * left, and on the right either its assigned Individual Back (with a control to
 * unpair it) or a control to assign one. Assigning expands an inline list of the
 * candidate images, of which the owner picks one.
 */
export const DeckIndividualBackRow = memo(
  ({
    card,
    unbackedCards,
    isOpen,
    disabled,
    onToggleOpen,
    onAssign,
    onRemove,
  }: {
    card: DeckCard;
    unbackedCards: DeckCard[];
    isOpen: boolean;
    disabled: boolean;
    onToggleOpen: () => void;
    onAssign: (backNodeId: string) => void;
    onRemove: () => void;
  }) => {
    // The images this card can take as a back: the other still-unbacked cards.
    const candidates = unbackedCards.filter(
      (candidate) => candidate.nodeId !== card.nodeId,
    );

    return (
      <div className="rounded-lg p-2">
        <div className="flex items-center gap-3">
          <DeckImageThumbnail nodeId={card.nodeId} />
          <span className="min-w-0 flex-1 truncate">{card.name}</span>
          {card.individualBack ? (
            <>
              <ArrowRight
                size={16}
                className="text-base-content/60 shrink-0"
                aria-label="has individual back"
              />
              <DeckImageThumbnail nodeId={card.individualBack.nodeId} />
              <span className="max-w-32 min-w-0 flex-1 truncate">
                {card.individualBack.name}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm shrink-0"
                disabled={disabled}
                onClick={onRemove}
              >
                <X size={16} />
                Remove
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm shrink-0"
              disabled={disabled || candidates.length === 0}
              aria-expanded={isOpen}
              onClick={onToggleOpen}
            >
              <Plus size={16} />
              {isOpen ? "Cancel" : "Set back"}
            </button>
          )}
        </div>

        {isOpen && !card.individualBack && (
          <div
            className="border-base-300 mt-2 ml-13 flex max-h-48 flex-col gap-1
              overflow-y-auto border-l pl-2"
          >
            {candidates.map((candidate) => (
              <button
                key={candidate.nodeId}
                type="button"
                className="hover:bg-base-200 flex cursor-pointer items-center
                  gap-3 rounded-lg p-2 text-left"
                disabled={disabled}
                onClick={() => onAssign(candidate.nodeId)}
              >
                <DeckImageThumbnail nodeId={candidate.nodeId} />
                <span className="min-w-0 flex-1 truncate">
                  {candidate.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);

DeckIndividualBackRow.displayName = "DeckIndividualBackRow";
