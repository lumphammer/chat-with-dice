import { DeckImageThumbnail } from "./DeckImageThumbnail";
import type { PairingProposal } from "./proposeIndividualBackPairings";
import { ArrowRight, X } from "lucide-react";
import { memo } from "react";

/**
 * One proposed front→Individual Back pairing in the {@link DeckPairingProposals}
 * review list: the front on the left, the proposed back on the right, and a
 * control to dismiss it. Dismissing drops just this proposal; the rest are still
 * applied. Mirrors the Individual Backs rows' layout so a proposal reads the
 * same as an applied pairing.
 */
export const DeckPairingProposalRow = memo(
  ({
    proposal,
    disabled,
    onDismiss,
  }: {
    proposal: PairingProposal;
    disabled: boolean;
    onDismiss: () => void;
  }) => {
    return (
      <div className="flex items-center gap-3 rounded-lg p-2">
        <DeckImageThumbnail nodeId={proposal.front.nodeId} />
        <span className="min-w-0 flex-1 truncate">{proposal.front.name}</span>
        <ArrowRight
          size={16}
          className="text-base-content/60 shrink-0"
          aria-label="proposed individual back"
        />
        <DeckImageThumbnail nodeId={proposal.back.nodeId} />
        <span className="max-w-32 min-w-0 flex-1 truncate">
          {proposal.back.name}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm shrink-0"
          disabled={disabled}
          onClick={onDismiss}
        >
          <X size={16} />
          Dismiss
        </button>
      </div>
    );
  },
);

DeckPairingProposalRow.displayName = "DeckPairingProposalRow";
