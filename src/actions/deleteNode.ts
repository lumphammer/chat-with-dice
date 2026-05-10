import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const deleteNode = defineAction({
  input: z.object({
    nodeId: z.string(),
  }),
  handler: async ({ nodeId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }
    const userDataDO = env.USER_DATA_DO.getByName(user.id);
    const result = await userDataDO.softDeleteNode(nodeId);
    return result;
  },
});
