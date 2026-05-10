// import { db as d1 } from "#/db";
import migrations from "#/durable-object-migrations/UserDataDO/migrations.js";
import * as dbSchema from "#/schemas/UserDataDO-schema";
import { folders, nodes } from "#/schemas/UserDataDO-schema";
import { setupDB } from "../utils/setupDB";
import type { PathResolution } from "./types";
import { log } from "./utils";
import { DurableObject } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { nanoid } from "nanoid";

export class UserDataDO extends DurableObject {
  private db!: DrizzleSqliteDODatabase<
    typeof dbSchema,
    typeof dbSchema.relations
  >;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    log(
      "\n\n=====================================\nUserDataDO id booting:",
      ctx.id.toString(),
    );

    this.ctx.blockConcurrencyWhile(async () => {
      // d1.query.users.findFirst({
      //   where: {
      //     id:
      //   }
      // })
      this.db = setupDB(ctx, migrations, dbSchema, dbSchema.relations);
    });
  }

  /**
   * Resolve a URL path like `["campaigns", "maps"]` to a folder ID using a
   * recursive CTE. Returns breadcrumbs for each resolved segment.
   *
   * If the full path resolves to folders, returns `{ kind: "folder" }`.
   * If all-but-last resolve to folders and the last segment is a file in that
   * folder, returns `{ kind: "file" }`.
   * Otherwise returns `{ kind: "not-found" }`.
   */
  async resolvePathToFolder(pathSegments: string[]): Promise<PathResolution> {
    // empty path = root folder
    if (pathSegments.length === 0) {
      return { kind: "folder", folderId: null, breadcrumbs: [] };
    }

    const pathJson = JSON.stringify(pathSegments);

    const result = this.db.run(sql`
      WITH RECURSIVE
        path_walk (folder_id, depth) AS (
          SELECT
            nodes.id,
            0
          FROM
            nodes,
            json_each(${pathJson}) je
          WHERE
            je.key = 0
            AND nodes.parent_folder_id IS NULL
            AND nodes.deleted_time IS NULL
            AND nodes.folder_id IS NOT NULL
            AND nodes.name = je.value
          UNION ALL
          SELECT
            nodes.id,
            pw.depth + 1
          FROM
            path_walk pw
            JOIN json_each(${pathJson}) je ON je.key = pw.depth + 1
            JOIN nodes ON nodes.parent_folder_id = pw.folder_id
          WHERE
            AND nodes.deleted_time IS NULL
            AND nodes.folder_id IS NOT NULL
            AND nodes.name = je.value
        )
      SELECT * FROM path_walk
    `);

    const rows = result.toArray() as Array<{
      folder_id: string;
      depth: number;
    }>;

    // all segments resolved as folders
    if (rows.length === pathSegments.length) {
      const breadcrumbs = rows.map((row, i) => ({
        id: row.folder_id,
        name: pathSegments[i],
      }));
      const lastRow = rows[rows.length - 1];
      return {
        kind: "folder",
        folderId: lastRow.folder_id,
        breadcrumbs,
      };
    }

    // all-but-last resolved — check if the last segment is a file
    if (rows.length === pathSegments.length - 1) {
      const parentFolderId =
        rows.length > 0 ? rows[rows.length - 1].folder_id : null;
      const fileName = pathSegments[pathSegments.length - 1];

      const fileNode = await this.db.query.nodes.findFirst({
        where: {
          parentFolderId: parentFolderId ?? { isNull: true },
          deletedTime: { isNull: true },
          name: fileName,
          fileId: { isNotNull: true },
        },
      });

      if (fileNode) {
        const breadcrumbs = rows.map((row, i) => ({
          id: row.folder_id,
          name: pathSegments[i],
        }));
        return {
          kind: "file",
          folderId: parentFolderId,
          fileNodeId: fileNode.id,
          breadcrumbs,
        };
      }
    }

    return { kind: "not-found" };
  }

  getNodes(folderId?: string | null) {
    const childNodes = this.db.query.nodes.findMany({
      where: {
        deletedTime: {
          isNull: true,
        },
        parentFolderId: folderId ?? {
          isNull: true,
        },
      },
      with: {
        file: true,
        folder: true,
      },
    });

    return childNodes;
  }

  createFolder(name: string, parentFolderId?: string | null) {
    // const id = crypto.randomUUID();
    const id = nanoid();

    try {
      this.db.transaction((tx) => {
        tx.insert(folders).values({
          id,
          recursiveSizeBytes: 0,
        });
        tx.insert(nodes).values({
          id,
          name,
          folderId: id,
          parentFolderId,
        });
      });
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
  }

  async deleteNode(nodeId: string) {
    // fetch node + relations to determine size to subtract
    const node = await this.db.query.nodes.findFirst({
      where: {
        id: nodeId,
        deletedTime: { isNull: true },
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
    await this.db
      .update(nodes)
      .set({ deletedTime: Date.now() })
      .where(eq(nodes.id, nodeId));

    // decrement ancestor folder sizes
    const sizeToSubtract = node.file
      ? node.file.sizeBytes
      : (node.folder?.recursiveSizeBytes ?? 0);

    if (node.parentFolderId && sizeToSubtract > 0) {
      this.db.run(sql`
        WITH RECURSIVE ancestors(folder_id) AS (
          SELECT ${node.parentFolderId}
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
  }

  async createFile() {
    const id = crypto.randomUUID();
    const r2Key = `user-files/${user.id}/${id}`;
    try {
      await db.batch([
        db.insert(files).values({
          id,
          sizeBytes: 0,
          isReady: 0,
          r2Key,
          contentType,
        }),
        db.insert(nodes).values({
          id,
          name: filename,
          fileId: id,
          ownerUserId: user.id,
          parentFolderId: folderId,
        }),
      ]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return json(
          { error: "A file with that name already exists in this folder" },
          HTTP_CONFLICT,
        );
      }
      throw error;
    }
  }
}
