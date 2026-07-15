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
      fireHook,
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

      // Fires for "not-found" as well as "removed": either way there is now no
      // live share for this node here, so anything holding state derived from
      // it should drop that state. Queued until this action commits.
      fireHook("files:onShareRemoved", {
        ownerUserId: payload.ownerUserId,
        nodeId: payload.nodeId,
      });
    },
  },
});
