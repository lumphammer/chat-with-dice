import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

const MAX_NAME_LENGTH = 128;

export const renameNode = defineAction({
  input: z.object({
    nodeId: z.string(),
    newName: z.string().min(1).max(MAX_NAME_LENGTH),
  }),
  handler: async ({ nodeId, newName }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }

    const userDataDO = env.USER_DATA_DO.getByName(user.id);
    await userDataDO.renameNode(nodeId, newName);
  },
});
