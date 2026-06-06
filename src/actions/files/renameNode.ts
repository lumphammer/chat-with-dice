import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
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
      throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }
    if (!user.userDataDOId) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "User data DO id not found",
      });
    }

    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(user.userDataDOId),
    );
    await userDataDO.renameNode(nodeId, newName);
  },
});
