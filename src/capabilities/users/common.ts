import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

export const usersCommon = createCapabilityCommon({
  name: "users",
  displayName: "Users",
  visibility: "public",
  state: {
    validator: z.object({
      // Everyone seen in this room since the DO last (re)booted. `isOnline`
      // distinguishes the current set from those who have since left — "recently
      // seen" is a superset of "online now". Carries the badge fields
      // (`isAnonymous`, `image`) so the sidebar can render straight from state.
      recentUsers: z.array(
        z.object({
          userId: z.string(),
          displayName: z.string(),
          isAnonymous: z.boolean(),
          image: z.string().optional(),
          lastSeenTime: z.int(),
          isOnline: z.boolean(),
        }),
      ),
    }),
    getInitialState: () => ({ recentUsers: [] }),
  },
});
