import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const setFolderIsDeck = defineAction({
  input: z.object({
    nodeId: z.string(),
    isDeck: z.boolean(),
  }),
  handler: async ({ nodeId, isDeck }, context) => {
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
    await userDataDO.setFolderIsDeck(nodeId, isDeck);
  },
});
