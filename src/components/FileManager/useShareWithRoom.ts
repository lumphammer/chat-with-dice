import { filesCapability } from "#/capabilities/filesCapability";
import { hasDirectRoomShare } from "#/capabilities/filesShareHelpers";
import { authClient } from "#/utils/auth-client";
import { useCallback } from "react";

export const useShareWithRoom = (nodeId: string | null | undefined) => {
  const filesCap = filesCapability.useMount();
  const { data: sessionData } = authClient.useSession();
  const ownerUserId = sessionData?.user.id ?? null;
  const canShareWithRoom =
    filesCap.initialised && nodeId != null && ownerUserId != null;
  const isSharedWithRoom =
    filesCap.initialised && nodeId != null && ownerUserId != null
      ? hasDirectRoomShare(filesCap.state.shares, { nodeId, ownerUserId })
      : false;
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

  const unshareFromRoom = useCallback(() => {
    if (nodeId != null && ownerUserId != null) {
      unshareFile?.({ nodeId, ownerUserId });
    }
  }, [nodeId, ownerUserId, unshareFile]);

  return {
    canShareWithRoom,
    shareWithRoom,
    canUnshareFromRoom,
    unshareFromRoom,
    isSharedWithRoom,
  };
};
