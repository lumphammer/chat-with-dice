import { db } from "#/db";
import { folders, nodes } from "#/schemas/chatDB-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";

const MAX_FILE_NAME_LENGTH = 128;

export const createFolder = defineAction({
  input: z.object({
    name: z.string().min(1).max(MAX_FILE_NAME_LENGTH),
    parentFolderId: z.string().nullable().optional(),
  }),
  handler: async ({ name, parentFolderId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      return new Response("Forbidden", { status: 403 });
    }

    const id = crypto.randomUUID();
    await db.insert(folders).values({
      id,
      recursive_size_bytes: 0,
    });
    await db.insert(nodes).values({
      id,
      name,
      folder_id: id,
      owner_user_id: user.id,
      // created_time: 0,
      // deleted_time: null,
      // file_id: null,
      parent_folder_id: parentFolderId,
    });
  },
});
