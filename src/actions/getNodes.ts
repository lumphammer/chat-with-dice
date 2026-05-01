import { getUserNodes } from "#/pages/files/_components/queries";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";

export const getNodes = defineAction({
  input: z.object({
    folderId: z.string().nullable().optional(),
  }),
  handler: async ({ folderId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }

    return getUserNodes(user.id, folderId ?? undefined);
  },
});
