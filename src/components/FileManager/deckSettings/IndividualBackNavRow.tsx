import { Link } from "#/lib/minirouter";
import { DeckImageThumbnail } from "../DeckImageThumbnail";
import type { DeckCard } from "../DeckIndividualBacksEditor";
import { cardBack } from "./directions";
import { ArrowRight, ChevronRight, X } from "lucide-react";
import { memo } from "react";

/**
 * One Card's row in the {@link IndividualBacksPanel}: the front on the left, and
 * on the right either its assigned Individual Back (with a control to unpair it)
 * or a control that drills down to the per-card picker. The old inline-expanding
 * candidate list — the third nested scroller — is gone; picking a back now
 * happens on its own panel ({@link CardBackPanel}).
 */
export const IndividualBackNavRow = memo(
  ({
    card,
    candidateCount,
    disabled,
    onRemove,
  }: {
    card: DeckCard;
    candidateCount: number;
    disabled: boolean;
    onRemove: () => void;
  }) => {
    if (card.individualBack) {
      return (
        <div className="flex items-center gap-3 p-3">
          <DeckImageThumbnail nodeId={card.nodeId} />
          <span className="min-w-0 flex-1 truncate">{card.name}</span>
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
        </div>
      );
    }

    return (
      <Link
        to={cardBack(card.nodeId)}
        disabled={disabled || candidateCount === 0}
        className="hover:bg-base-200 flex w-full items-center gap-3 rounded-lg
          p-3 text-left disabled:opacity-50"
      >
        <DeckImageThumbnail nodeId={card.nodeId} />
        <span className="min-w-0 flex-1 truncate">{card.name}</span>
        <span className="text-base-content/60 shrink-0">
          {candidateCount === 0 ? "No images free" : "Set back"}
        </span>
        <ChevronRight
          size={20}
          className="text-base-content/60 shrink-0"
          aria-hidden="true"
        />
      </Link>
    );
  },
);

IndividualBackNavRow.displayName = "IndividualBackNavRow";
