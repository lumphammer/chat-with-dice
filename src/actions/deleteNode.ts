import { db } from "#/db";
import { nodes } from "#/schemas/chatDB-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { and, eq, isNull } from "drizzle-orm";

export const deleteNode = defineAction({
  input: z.object({
    nodeId: z.string(),
  }),
  handler: async ({ nodeId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }

    const result = await db
      .update(nodes)
      .set({ deleted_time: Date.now() })
      .where(
        and(
          eq(nodes.id, nodeId),
          eq(nodes.owner_user_id, user.id),
          isNull(nodes.deleted_time),
        ),
      );

    if (result.meta.changes === 0) {
      throw new Error("File or folder not found");
    }
  },
});
