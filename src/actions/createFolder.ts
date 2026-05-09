import { db } from "#/db";
import { folders, nodes } from "#/schemas/coreD1-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";

const MAX_NAME_LENGTH = 128;

export const createFolder = defineAction({
  input: z.object({
    name: z.string().min(1).max(MAX_NAME_LENGTH),
    parentFolderId: z.string().nullable().optional(),
  }),
  handler: async ({ name, parentFolderId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }

    const id = crypto.randomUUID();

    try {
      await db.batch([
        db.insert(folders).values({
          id,
          recursive_size_bytes: 0,
        }),
        db.insert(nodes).values({
          id,
          name,
          folder_id: id,
          owner_user_id: user.id,
          parent_folder_id: parentFolderId,
        }),
      ]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("A folder with that name already exists here", {
          cause: error,
        });
      }
      throw error;
    }

    return { id, name };
  },
});
