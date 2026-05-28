import { filesCapability } from "#/capabilities/filesCapability";
import { hasDirectRoomShare } from "#/capabilities/filesShareHelpers";
import { authClient } from "#/utils/auth-client";
import { useCallback } from "react";

export const useShareWithRoom = (
  nodeId: string | null | undefined,
  readOnly: boolean,
) => {
  const filesCap = filesCapability.useMount();
  const { data: sessionData } = authClient.useSession();

  const userId = sessionData?.user.id ?? null;
  const canShareWithRoom =
    !readOnly && filesCap.initialised && nodeId != null && userId != null;
  const isSharedWithRoom =
    filesCap.initialised && nodeId != null && userId != null
      ? hasDirectRoomShare(filesCap.state.shares, {
          nodeId,
          ownerUserId: userId,
        })
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
    if (nodeId != null && userId != null) {
      unshareFile?.({ nodeId, ownerUserId: userId });
    }
  }, [nodeId, userId, unshareFile]);

  return {
    canShareWithRoom,
    shareWithRoom,
    canUnshareFromRoom,
    unshareFromRoom,
    isSharedWithRoom,
  };
};
