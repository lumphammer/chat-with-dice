import { cardsClient } from "#/capabilities/cards/client";
import { findPile } from "#/capabilities/cards/common";
import { filesClient } from "#/capabilities/files/client";
import type { SharedItem } from "#/capabilities/files/common";
import { useOptionalRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { RemoveShareConfirmDialog } from "./RemoveShareConfirmDialog";
import { Trash2 } from "lucide-react";
import { memo, useCallback, useRef } from "react";

/**
 * Trashcan control for a shared-items list row: removes the share from the room
 * behind a confirmation. The caller decides whether to render it (a room owner
 * for any share, a user for their own).
 */
export const RemoveShareControl = memo(({ item }: { item: SharedItem }) => {
  const filesCap = filesClient.useMount();
  const cardsCap = cardsClient.useMount();
  const roomInfo = useOptionalRoomInfoContext();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const removeShare = filesCap.initialised
    ? filesCap.actions.removeShare
    : null;

  const performRemove = useCallback(() => {
    removeShare?.({ nodeId: item.node.id, ownerUserId: item.userId });
  }, [removeShare, item.node.id, item.userId]);

  // Removing a Deck drops the room's Pile for it — the Discard of a half-drawn
  // session — for good (ADR-0001). The Pile is keyed by the *share's* owner, not
  // the current user, so a room owner removing someone else's Deck still gets
  // the right warning. Mirrors the check in useShareWithRoom: a room without the
  // `cards` capability has no Piles, and while `cards` is still loading we warn
  // rather than risk silently clearing a Discard.
  const isDeck = item.node.kind === "folder" && item.node.isDeck;
  const cardsEnabledInRoom =
    roomInfo?.roomConfig.capabilities.some(
      (capability) => capability.name === "cards",
    ) ?? false;
  const pile =
    isDeck && cardsCap.initialised
      ? findPile(cardsCap.state, item.userId, item.node.id)
      : undefined;
  const deckHasPile =
    isDeck &&
    cardsEnabledInRoom &&
    (!cardsCap.initialised || (pile?.discard.length ?? 0) > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`Remove "${item.node.name}" from this room`}
        className="text-base-content/40 hover:text-error hover:bg-base-200 flex
          size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg
          transition-colors"
      >
        <Trash2 size={18} />
      </button>
      <RemoveShareConfirmDialog
        ref={dialogRef}
        name={item.node.name}
        deckHasPile={deckHasPile}
        onConfirm={performRemove}
      />
    </>
  );
});

RemoveShareControl.displayName = "RemoveShareControl";
