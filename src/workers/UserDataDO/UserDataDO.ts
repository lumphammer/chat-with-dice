import { db as d1 } from "#/db";
import migrations from "#/durable-object-migrations/UserDataDO/migrations.js";
import * as dbSchema from "#/schemas/UserDataDO-schema";
import { setupDB } from "../utils/setupDB";
import type { PathResolution } from "./types";
import { log, logError } from "./utils";
import { DurableObject } from "cloudflare:workers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { nanoid } from "nanoid";

export class UserDataDO extends DurableObject {
  private db!: DrizzleSqliteDODatabase<
    typeof dbSchema,
    typeof dbSchema.relations
  >;
  private userId!: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    log(
      "\n\n=====================================\nUserDataDO id booting:",
      ctx.id.toString(),
    );

    void this.ctx.blockConcurrencyWhile(async () => {
      // Get the cached userId (it should never change), or if it's not in KV,
      // check min with D1 to see if out DO ID appears there and get the userId
      // that way.
      const cachedUserId = this.ctx.storage.kv.get("userId");
      if (typeof cachedUserId === "string") {
        this.userId = cachedUserId;
      } else {
        const user = await d1.query.users.findFirst({
          where: {
            user_data_do_id: this.ctx.id.toString(),
          },
        });
        if (!user) {
          throw new Error(
            `User does not exist in database with user_data_do_id ${this.ctx.id.toString()}`,
          );
        }
        this.ctx.storage.kv.put("userId", user.id);
        this.userId = user.id;
      }
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
    // throw new Error(
    //   `resolvePathToFolder: pathSegments=${JSON.stringify(pathSegments)}`,
    // );
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
            nodes.deleted_time IS NULL
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

  async createFolder(name: string, parentFolderId?: string | null) {
    // const id = crypto.randomUUID();
    const id = nanoid();

    try {
      await this.db.insert(dbSchema.folders).values({
        id,
        recursiveSizeBytes: 0,
      });
      await this.db.insert(dbSchema.nodes).values({
        id,
        name,
        folderId: id,
        parentFolderId,
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

  async softDeleteNode(nodeId: string) {
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
      .update(dbSchema.nodes)
      .set({ deletedTime: Date.now() })
      .where(eq(dbSchema.nodes.id, nodeId));

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

  async hardDeleteNode(nodeId: string) {
    await this.db.delete(dbSchema.nodes).where(eq(dbSchema.nodes.id, nodeId));
    await this.db.delete(dbSchema.files).where(eq(dbSchema.files.id, nodeId));
    await this.db
      .delete(dbSchema.folders)
      .where(eq(dbSchema.folders.id, nodeId));
  }

  async createFile(
    filename: string,
    contentType: string,
    folderId: string | null | undefined,
  ) {
    const id = crypto.randomUUID();
    const r2Key = `user-files/${this.userId}/${id}`;
    log(`createFile: ${filename}, ${r2Key}`);
    try {
      await this.db.insert(dbSchema.files).values({
        id,
        sizeBytes: 0,
        isReady: 0,
        r2Key,
        contentType,
      });
      log("finished inserting to files");
      await this.db.insert(dbSchema.nodes).values({
        id,
        name: filename,
        fileId: id,
        parentFolderId: folderId,
      });
      log("finished inserting to nodes");
      log("insert complete");
    } catch (cause) {
      logError(cause);
      if (
        cause instanceof Error &&
        cause.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("A file with that name already exists in this folder", {
          cause,
        });
      }
      throw cause;
    }
    return { id, r2Key };
  }

  async markFileReady(id: string, sizeBytes: number, folderId?: string | null) {
    await this.db
      .update(dbSchema.files)
      .set({
        isReady: 1,
        sizeBytes: sizeBytes,
      })
      .where(eq(dbSchema.files.id, id));

    if (folderId) {
      this.db.run(sql`
        WITH RECURSIVE ancestors(folder_id) AS (
          SELECT ${folderId}
          UNION ALL
          SELECT nodes.parent_folder_id
          FROM ancestors
          JOIN nodes ON nodes.folder_id = ancestors.folder_id
          WHERE nodes.parent_folder_id IS NOT NULL
        )
        UPDATE folders
        SET recursive_size_bytes = recursive_size_bytes + ${sizeBytes}
        WHERE id IN (SELECT folder_id FROM ancestors)
      `);
    }
  }

  async markFileThumbnailReady(
    id: string,
    thumbnailR2Key: string,
    thumbnailContentType: string,
    thumbnailSizeBytes: number,
  ) {
    const result = await this.db
      .update(dbSchema.files)
      .set({
        thumbnailR2Key,
        thumbnailContentType,
        thumbnailSizeBytes,
      })
      .where(eq(dbSchema.files.id, id));

    if (result.rowsWritten === 0) {
      throw new Error("File not found");
    }
  }

  async renameNode(id: string, newName: string) {
    try {
      const result = await this.db
        .update(dbSchema.nodes)
        .set({ name: newName })
        .where(
          and(eq(dbSchema.nodes.id, id), isNull(dbSchema.nodes.deletedTime)),
        );

      if (result.rowsWritten === 0) {
        throw new Error("File or folder not found");
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error(
          "An item with that name already exists in this folder",
          {
            cause: error,
          },
        );
      }
      throw error;
    }
  }

  async getFile(nodeId: string) {
    const node = await this.db.query.nodes.findFirst({
      where: {
        id: nodeId,
        deletedTime: { isNull: true },
      },
      with: {
        file: {
          where: {
            isReady: 1,
          },
        },
      },
    });

    if (!node || !node.file) {
      throw new Error(`File not found in database: ${nodeId}`);
    }
    return node as RecursiveExpand<
      Omit<typeof node, "file"> & { file: Exclude<(typeof node)["file"], null> }
    >;
  }

  async shareNodeWithRoom({
    nodeId,
    roomId,
    chatRoomDurableObjectId,
  }: {
    nodeId: string;
    roomId: string;
    chatRoomDurableObjectId: string;
  }) {
    console.log(
      `Sharing node ${nodeId} with room ${roomId} (${chatRoomDurableObjectId})`,
    );
  }
}
