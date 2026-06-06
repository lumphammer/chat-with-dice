import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const hardDeleteNode = defineAction({
  input: z.object({
    nodeId: z.string(),
  }),
  handler: async ({ nodeId }, context) => {
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
    const result = await userDataDO.hardDeleteNodes([nodeId]);
    return result;
  },
});
