import { db } from "#/db";
import { nodes } from "#/schemas/chatDB-schema";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";

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

    try {
      const result = await db
        .update(nodes)
        .set({ name: newName })
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
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("An item with that name already exists in this folder", {
          cause: error,
        });
      }
      throw error;
    }
  },
});
