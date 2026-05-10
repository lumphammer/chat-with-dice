import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

const MAX_NAME_LENGTH = 128;

export const createFolder = defineAction({
  input: z.object({
    name: z.string().min(1).max(MAX_NAME_LENGTH),
    parentFolderId: z.string().nullable().optional(),
  }),
  handler: async ({ name, parentFolderId }, { locals: { user } }) => {
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }
    const userDataDO = env.USER_DATA_DO.getByName(user.id);
    const result = await userDataDO.createFolder(name, parentFolderId);
    return result;
  },
});
