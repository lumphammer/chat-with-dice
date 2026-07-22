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
        stateDraft.shares.push({ ...sharedItem, unavailable: false });
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
    removeShare: async ({
      stateDraft,
      payload,
      userId,
      nodeShareManager,
      broadcaster,
      pureFn,
      fireHook,
    }) => {
      const result = await nodeShareManager.removeShareFromRoom({
        requestingUserId: userId,
        ownerUserId: payload.ownerUserId,
        nodeId: payload.nodeId,
      });

      // Only an authorisation failure stops the removal. A best-effort owner
      // notification that couldn't be delivered still returns "ok": dropping a
      // stale record whose owner or node is already gone is exactly what this
      // path is for, so the room's own record always goes.
      if (result.result === "error") {
        broadcaster.sendErrorToUserId(userId, result.reason);
        return;
      }

      pureFn({ stateDraft, payload });

      fireHook("files:onShareRemoved", {
        ownerUserId: payload.ownerUserId,
        nodeId: payload.nodeId,
      });
    },
  },
  hooks: {
    onShareAvailabilityChange: ({ stateDraft, event: { changes } }) => {
      for (const change of changes) {
        const share = stateDraft.shares.find(
          (candidate) =>
            candidate.userId === change.ownerUserId &&
            candidate.node.id === change.nodeId,
        );
        // A change for a share this room never cached is normal, not an error:
        // the owner's store fans one delete out to every room holding a share
        // under that node, and rooms disagree about what they cache.
        if (share) {
          share.unavailable = change.unavailable;
        }
      }
    },
    // The owner marked or unmarked the shared folder as a Deck. Update the
    // cached share so the Cards sidebar (which reads `node.isDeck` off these
    // shares) reflects it without a re-share. A change for a share this room
    // never cached, or one that somehow lands on a file, is a normal no-op.
    onShareDeckStatusChange: ({
      stateDraft,
      event: { ownerUserId, nodeId, isDeck },
    }) => {
      const share = stateDraft.shares.find(
        (candidate) =>
          candidate.userId === ownerUserId && candidate.node.id === nodeId,
      );
      if (share && share.node.kind === "folder") {
        share.node.isDeck = isDeck;
      }
    },
    // The node behind a share is gone for good — hard-deleted or purged by the
    // owner's store — so forget it rather than hiding it; there is nothing left
    // to restore. Same removal the `unshareFile` action does, driven instead by
    // the owner's DO. Idempotent: an in-room unshare fires this too, after its
    // own pureFn has already dropped the share, and finding nothing is fine.
    "files:onShareRemoved": ({
      stateDraft,
      event: { ownerUserId, nodeId },
    }) => {
      const index = stateDraft.shares.findIndex(
        (share) => share.userId === ownerUserId && share.node.id === nodeId,
      );
      if (index !== -1) {
        stateDraft.shares.splice(index, 1);
      }
    },
  },
});
