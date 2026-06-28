import { createServerCapability } from "#/capabilities/createServerCapability";
import { usersCommon } from "./common";

export const usersServer = createServerCapability(usersCommon, {
  hooks: {
    onPresenceChange: ({ event: { online }, stateDraft }) => {
      // Level-triggered: `online` is the full current set. Upsert each into
      // `recentUsers` (refreshing `lastSeenTime`); users who have since gone
      // offline stay in the list with a stale timestamp — "recently seen" is a
      // superset of "online now".
      const now = Date.now();
      for (const user of online) {
        const existing = stateDraft.recentUsers.find(
          (recent) => recent.userId === user.userId,
        );
        if (existing) {
          existing.displayName = user.displayName;
          existing.lastSeenTime = now;
        } else {
          stateDraft.recentUsers.push({
            userId: user.userId,
            displayName: user.displayName,
            lastSeenTime: now,
          });
        }
      }
    },
  },
});
