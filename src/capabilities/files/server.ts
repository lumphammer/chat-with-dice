import { createServerCapability } from "#/capabilities/createServerCapability";
import { type SharedItem, filesCommon } from "./common";

export const filesServer = createServerCapability(filesCommon, {
  actionEffects: {
    shareFile: async ({
      stateDraft,
      payload: { nodeId },
      userId,
      displayName,
      nodeShareManager,
      broadcaster,
      sendChatMessage,
    }) => {
      const shareResult = await nodeShareManager.shareUserNodeId({
        userId,
        nodeId,
        displayName,
      });

      if (shareResult.result === "error") {
        broadcaster.sendErrorToUserId(userId, shareResult.reason);
        return;
      }
      const sharedItem: SharedItem = shareResult.sharedItem;
      if (shareResult.result === "created") {
        stateDraft.shares.push(sharedItem);
      }
      sendChatMessage(sharedItem);
    },
    renameShare: async ({ stateDraft, payload, userId, pureFn }) => {
      pureFn({
        stateDraft,
        payload: { ...payload, ownerUserId: userId },
      });
    },
    unshareFile: async ({
      stateDraft,
      payload,
      userId,
      nodeShareManager,
      broadcaster,
      pureFn,
    }) => {
      const unshareResult = await nodeShareManager.unshareUserNodeId({
        requestingUserId: userId,
        ownerUserId: payload.ownerUserId,
        nodeId: payload.nodeId,
      });

      if (unshareResult.result === "error") {
        broadcaster.sendErrorToUserId(userId, unshareResult.reason);
        return;
      }

      pureFn({ stateDraft, payload });
    },
  },
});
