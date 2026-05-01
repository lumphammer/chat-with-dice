import { db } from "#/db";
import { nodes } from "#/schemas/chatDB-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { eq, sql } from "drizzle-orm";

export const deleteNode = defineAction({
  input: z.object({
    nodeId: z.string(),
  }),
  handler: async ({ nodeId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new Error("Unauthorized");
    }

    // fetch node + relations to determine size to subtract
    const node = await db.query.nodes.findFirst({
      where: {
        id: nodeId,
        owner_user_id: user.id,
        deleted_time: { isNull: true },
      },
      with: {
        file: true,
        folder: true,
      },
    });

    if (!node) {
      throw new Error("File or folder not found");
    }

    // soft delete
    await db
      .update(nodes)
      .set({ deleted_time: Date.now() })
      .where(eq(nodes.id, nodeId));

    // decrement ancestor folder sizes
    const sizeToSubtract = node.file
      ? node.file.size_bytes
      : (node.folder?.recursive_size_bytes ?? 0);

    if (node.parent_folder_id && sizeToSubtract > 0) {
      await db.run(sql`
        WITH RECURSIVE ancestors(folder_id) AS (
          SELECT ${node.parent_folder_id}
          UNION ALL
          SELECT nodes.parent_folder_id
          FROM ancestors
          JOIN nodes ON nodes.folder_id = ancestors.folder_id
          WHERE nodes.parent_folder_id IS NOT NULL
        )
        UPDATE folders
        SET recursive_size_bytes = recursive_size_bytes - ${sizeToSubtract}
        WHERE id IN (SELECT folder_id FROM ancestors)
      `);
    }
  },
});
