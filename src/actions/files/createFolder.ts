import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

const MAX_NAME_LENGTH = 128;

export const createFolder = defineAction({
  input: z.object({
    name: z.string().min(1).max(MAX_NAME_LENGTH),
    parentFolderId: z.string().nullable().optional(),
  }),
  handler: async ({ name, parentFolderId }, { locals: { user } }) => {
    if (!user || user.isAnonymous || !user.userDataDOId) {
      throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }
    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(user.userDataDOId),
    );
    const result = await userDataDO.createFolder(name, parentFolderId);
    return result;
  },
});
