import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const restoreNode = defineAction({
  input: z.object({
    nodeId: z.string(),
  }),
  handler: async ({ nodeId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }
    if (!user.userDataDOId) {
      throw new Error("User data DO id not found");
    }
    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(user.userDataDOId),
    );
    const result = await userDataDO.restoreNode(nodeId);
    return result;
  },
});
