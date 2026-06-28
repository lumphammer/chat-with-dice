import { createServerCapability } from "#/capabilities/createServerCapability";
import { usersCommon } from "./common";

export const usersServer = createServerCapability(usersCommon, {
  hooks: {
    onPresenceChange: ({ event: { online }, stateDraft }) => {
      // Level-triggered: `online` is the full current set. First reconcile every
      // known user's `isOnline` against it (so users who left flip to offline
      // but stay in the list), then upsert the online users — refreshing their
      // details and `lastSeenTime`. "Recently seen" is a superset of "online".
      const now = Date.now();
      const onlineIds = new Set(online.map((user) => user.userId));
      for (const recent of stateDraft.recentUsers) {
        recent.isOnline = onlineIds.has(recent.userId);
      }
      for (const user of online) {
        const existing = stateDraft.recentUsers.find(
          (recent) => recent.userId === user.userId,
        );
        if (existing) {
          existing.displayName = user.displayName;
          existing.isAnonymous = user.isAnonymous;
          existing.image = user.image;
          existing.lastSeenTime = now;
          existing.isOnline = true;
        } else {
          stateDraft.recentUsers.push({
            userId: user.userId,
            displayName: user.displayName,
            isAnonymous: user.isAnonymous,
            image: user.image,
            lastSeenTime: now,
            isOnline: true,
          });
        }
      }
    },
  },
});
