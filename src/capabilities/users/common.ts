import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { z } from "zod/v4";

export const usersCommon = createCapabilityCommon({
  name: "users",
  displayName: "Users",
  stateValidator: z.object({
    recentUsers: z.array(
      z.object({
        userId: z.string(),
        displayName: z.string(),
        lastSeenTime: z.int(),
      }),
    ),
  }),
  getInitialState: () => ({ recentUsers: [] }),
  buildActions: () => ({}),
});
