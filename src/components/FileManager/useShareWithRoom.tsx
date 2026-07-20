import { authClient } from "#/auth/authClient.ts";
import { cardsClient } from "#/capabilities/cards/client";
import { findPile } from "#/capabilities/cards/common";
import { filesClient } from "#/capabilities/files/client";
import { useOptionalRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { UnshareDeckConfirmDialog } from "./UnshareDeckConfirmDialog";
import { useCallback, useRef } from "react";

export const useShareWithRoom = (
  nodeId: string | null | undefined,
  readOnly: boolean,
  nodeName?: string,
) => {
  const filesCap = filesClient.useMount();
  const cardsCap = cardsClient.useMount();
  const roomInfo = useOptionalRoomInfoContext();
  const { data: sessionData } = authClient.useSession();
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  const userId = sessionData?.user.id ?? null;
  const canShareWithRoom =
    !readOnly && filesCap.initialised && nodeId !== null && userId !== null;
  const sharedNode =
    filesCap.initialised && nodeId != null && userId != null
      ? filesCap.state.shares.find(
          (share) => share.userId === userId && share.node.id === nodeId,
        )?.node
      : undefined;
  const isSharedWithRoom = sharedNode !== undefined;
  const canUnshareFromRoom = canShareWithRoom && isSharedWithRoom;

  const shareFile = filesCap.initialised ? filesCap.actions.shareFile : null;
  const unshareFile = filesCap.initialised
    ? filesCap.actions.unshareFile
    : null;

  const shareWithRoom = useCallback(() => {
    if (nodeId != null) {
      shareFile?.({ nodeId });
    }
  }, [nodeId, shareFile]);

  const performUnshare = useCallback(() => {
    if (nodeId != null && userId != null) {
      unshareFile?.({ nodeId, ownerUserId: userId });
    }
  }, [nodeId, userId, unshareFile]);

  // Unsharing a plain file is harmless, but unsharing a Deck drops the room's
  // Pile — a half-drawn session's Discard — for good (ADR-0001). Only a Deck
  // whose Pile has something in its Discard has state worth losing, so a Deck is
  // the only kind of node this ever confirms; a Deck that returns its Cards (no
  // Pile, or an empty Discard) unshares straight away, like any other folder.
  const isDeckShare =
    sharedNode !== undefined &&
    sharedNode.kind === "folder" &&
    sharedNode.isDeck;
  const pile =
    cardsCap.initialised && userId != null && nodeId != null
      ? findPile(cardsCap.state, userId, nodeId)
      : undefined;

  // `cards` state arrives as its own message, so it can still be loading while
  // `files` (and this unshare control) is already live. If the room has `cards`
  // but its Piles haven't arrived, a Deck with a Discard would slip through the
  // Discard check unconfirmed, so err on the side of confirming until it loads.
  // Gated on the node actually being a Deck, so plain files and folders never
  // raise the deck-specific dialog during that window. A room without `cards`
  // has no Piles at all — and standalone file managers (no room context) never
  // do — so those unshare freely, as before.
  const cardsEnabledInRoom =
    roomInfo?.roomConfig.capabilities.some(
      (capability) => capability.name === "cards",
    ) ?? false;
  const unshareNeedsConfirmation =
    isDeckShare && cardsEnabledInRoom
      ? !cardsCap.initialised || (pile?.discard.length ?? 0) > 0
      : false;

  const unshareFromRoom = useCallback(() => {
    if (unshareNeedsConfirmation) {
      confirmDialogRef.current?.showModal();
    } else {
      performUnshare();
    }
  }, [unshareNeedsConfirmation, performUnshare]);

  // Rendered by the caller alongside its unshare trigger. Only present when a
  // confirmation is actually possible, so callers that never share a Deck pay
  // nothing.
  const unshareConfirmation = unshareNeedsConfirmation ? (
    <UnshareDeckConfirmDialog
      ref={confirmDialogRef}
      name={nodeName ?? "this deck"}
      onConfirm={performUnshare}
    />
  ) : null;

  return {
    canShareWithRoom,
    shareWithRoom,
    canUnshareFromRoom,
    unshareFromRoom,
    isSharedWithRoom,
    unshareConfirmation,
  };
};
