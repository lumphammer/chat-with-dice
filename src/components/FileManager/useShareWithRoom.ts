import { authClient } from "#/auth/authClient.ts";
import { filesClient } from "#/capabilities/files/client";
import { useCallback } from "react";

export const useShareWithRoom = (
  nodeId: string | null | undefined,
  readOnly: boolean,
) => {
  const filesCap = filesClient.useMount();
  const { data: sessionData } = authClient.useSession();

  const userId = sessionData?.user.id ?? null;
  const canShareWithRoom =
    !readOnly && filesCap.initialised && nodeId !== null && userId !== null;
  const isSharedWithRoom =
    filesCap.initialised &&
    nodeId !== null &&
    userId !== null &&
    filesCap.state.shares.some(
      (share) => share.userId === userId && share.node.id === nodeId,
    );
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
