import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const getNodes = defineAction({
  input: z.object({
    folderId: z.string().nullable().optional(),
  }),
  handler: async ({ folderId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }

    const userDataDO = env.USER_DATA_DO.getByName(user.id);
    const result = await userDataDO.getNodes(folderId);
    return result;
  },
});
