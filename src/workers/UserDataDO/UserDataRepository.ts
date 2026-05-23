import migrations from "#/durable-object-migrations/UserDataDO/migrations.js";
import * as dbSchema from "#/schemas/UserDataDO-schema";
import { setupDB } from "../utils/setupDB";
import { logError } from "./utils";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

type DBHandle = DrizzleSqliteDODatabase<
  typeof dbSchema,
  typeof dbSchema.relations
>;

export type PathWalkRow = { folder_id: string; depth: number };

/**
 * Owns the per-user durable SQLite database: migrations, the Drizzle adapter,
 * and every individual query the UserDataDO needs.
 *
 * Methods here are query primitives — the DO composes them into higher-level
 * behavior (multi-step flows, error message wrapping, DTO assembly).
 *
 * Recursive CTEs are hand-rolled in `sql` because Drizzle doesn't model them
 * yet; they still live here since they're individual queries returning raw
 * rows.
 */
export class UserDataRepository {
  private db: DBHandle;

  constructor(ctx: DurableObjectState) {
    this.db = setupDB(ctx, migrations, dbSchema, dbSchema.relations);
  }

  async getRootSize() {
    const result = await this.db
      .select({
        // `+` isn't expressible in Drizzle, hence the `sql` template. COALESCE
        // is because SUM() over zero rows is NULL, and NULL + x is NULL.
        total: sql<number>`
          COALESCE(SUM(CASE WHEN ${dbSchema.files.isReady} = 1 THEN ${dbSchema.files.sizeBytes} END), 0)
          + COALESCE(SUM(${dbSchema.folders.recursiveSizeBytes}), 0)
        `,
      })
      .from(dbSchema.nodes)
      .leftJoin(dbSchema.files, eq(dbSchema.nodes.id, dbSchema.files.id))
      .leftJoin(dbSchema.folders, eq(dbSchema.nodes.id, dbSchema.folders.id))
      .where(
        and(
          isNull(dbSchema.nodes.parentFolderId),
          isNull(dbSchema.nodes.deletedTime),
        ),
      );
    const total = result.at(0)?.total;
    if (typeof total !== "number") {
      logError("User quota usage failed");
      return undefined;
    }
    return total;
  }

  // === Path walking ===

  /**
   * Walk `pathSegments` from the root, matching each segment by name against
   * live (non-deleted) folder nodes. Stops at the first segment that fails to
   * match. Returns one row per resolved segment in depth order.
   */
  walkPathSegments(pathSegments: string[]): PathWalkRow[] {
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

    return result.toArray() as PathWalkRow[];
  }

  findFileNodeByNameInFolder(parentFolderId: string | null, name: string) {
    return this.db.query.nodes.findFirst({
      where: {
        parentFolderId: parentFolderId ?? { isNull: true },
        deletedTime: { isNull: true },
        name,
        fileId: { isNotNull: true },
      },
    });
  }

  // === Node lookups ===

  /** Find a non-deleted node by id, with its file/folder relations. */
  findNodeWithRelations(nodeId: string) {
    return this.db.query.nodes.findFirst({
      where: {
        id: nodeId,
        deletedTime: { isNull: true },
      },
      with: {
        file: true,
        folder: true,
      },
    });
  }

  /**
   * Find a non-deleted node by id, with its file relation restricted to ready
   * files. If the node has a file that isn't ready, the relation comes back
   * null.
   */
  findNodeWithReadyFile(nodeId: string) {
    return this.db.query.nodes.findFirst({
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
  }

  /** List live children of a folder (`null` = root). */
  findChildNodes(folderId: string | null | undefined) {
    return this.db.query.nodes.findMany({
      where: {
        deletedTime: { isNull: true },
        parentFolderId: folderId ?? { isNull: true },
      },
      with: {
        file: true,
        folder: true,
      },
    });
  }

  // === Creates ===

  /** Create a folder row and its matching node row. */
  async createFolder(
    id: string,
    name: string,
    parentFolderId: string | null | undefined,
  ) {
    // PRAGMA here to allow us to insert into two tables with mutually dependant
    // foreign keys. The *correct* way would be to declare the FKs as
    // "DEFERRABLE INITIALLY DEFERRED" and then run these inserts in a
    // transaction. However, 1. Drizzle doesn't have a way to express deferred
    // FKs, and 2. seems like drizzle transactions in durbale objects are
    // broken at the moment.
    // https://sqlite.org/pragma.html#pragma_foreign_keys
    // https://sqlite.org/foreignkeys.html#fk_deferred
    this.db.run(sql`PRAGMA foreign_keys = OFF`);
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
    this.db.run(sql`PRAGMA foreign_keys = ON`);
  }

  /** Create a file row (initially unready, size 0) and its matching node row. */
  async createFile(values: {
    id: string;
    name: string;
    r2Key: string;
    contentType: string;
    parentFolderId: string | null | undefined;
  }) {
    // see comment about PRAGMA in createFolder ☝️
    this.db.run(sql`PRAGMA foreign_keys = OFF`);
    await this.db.insert(dbSchema.files).values({
      id: values.id,
      r2Key: values.r2Key,
      contentType: values.contentType,
      sizeBytes: 0,
      isReady: 0,
    });
    await this.db.insert(dbSchema.nodes).values({
      id: values.id,
      name: values.name,
      fileId: values.id,
      parentFolderId: values.parentFolderId,
    });
    this.db.run(sql`PRAGMA foreign_keys = ON`);
  }

  // === Updates ===

  setNodeDeletedTime(nodeId: string, deletedTime: number) {
    return this.db
      .update(dbSchema.nodes)
      .set({ deletedTime })
      .where(eq(dbSchema.nodes.id, nodeId));
  }

  /** Rename a node, scoped to live (non-deleted) rows. */
  setNodeName(nodeId: string, name: string) {
    return this.db
      .update(dbSchema.nodes)
      .set({ name })
      .where(
        and(eq(dbSchema.nodes.id, nodeId), isNull(dbSchema.nodes.deletedTime)),
      );
  }

  markFileReady(id: string, sizeBytes: number) {
    return this.db
      .update(dbSchema.files)
      .set({
        isReady: 1,
        sizeBytes,
      })
      .where(eq(dbSchema.files.id, id));
  }

  setFileThumbnail(
    id: string,
    thumbnail: {
      thumbnailR2Key: string;
      thumbnailContentType: string;
      thumbnailSizeBytes: number;
    },
  ) {
    return this.db
      .update(dbSchema.files)
      .set(thumbnail)
      .where(eq(dbSchema.files.id, id));
  }

  // === Recursive CTE updates ===

  /**
   * Walk up from `folderId` and add `delta` to every ancestor folder's
   * `recursive_size_bytes`. Pass a negative `delta` to decrement.
   */
  adjustAncestorSizes(folderId: string, delta: number) {
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
      SET recursive_size_bytes = recursive_size_bytes + ${delta}
      WHERE id IN (SELECT folder_id FROM ancestors)
    `);
  }

  /**
   * True if `nodeId` or any of its ancestor folders is in
   * `room_resource_shares` for `roomId`. Read-side authorization for cross-user
   * file/folder access: sharing a folder grants access to every descendant.
   */
  isNodeReachableFromShare(nodeId: string, roomId: string): boolean {
    const result = this.db.run(sql`
      WITH RECURSIVE ancestors (node_id, parent_folder_id) AS (
        SELECT id, parent_folder_id
        FROM nodes
        WHERE id = ${nodeId}
          AND deleted_time IS NULL
        UNION ALL
        SELECT n.id, n.parent_folder_id
        FROM ancestors a
        JOIN nodes n ON n.folder_id = a.parent_folder_id
        WHERE a.parent_folder_id IS NOT NULL
          AND n.deleted_time IS NULL
      )
      SELECT 1
      FROM ancestors a
      JOIN room_resource_shares rrs ON rrs.node_id = a.node_id
      WHERE rrs.room_id = ${roomId}
      LIMIT 1
    `);

    return result.toArray().length > 0;
  }

  // === Deletes ===

  hardDeleteNode(id: string) {
    return this.db.delete(dbSchema.nodes).where(eq(dbSchema.nodes.id, id));
  }

  // === Shares ===

  findShareWithNode(nodeId: string, roomDurableObjectId: string) {
    return this.db.query.roomResourceShares.findFirst({
      where: { nodeId, roomDurableObjectId },
      with: {
        node: {
          with: { file: true, folder: true },
        },
      },
    });
  }

  createShare(values: {
    id: string;
    nodeId: string;
    roomId: string;
    roomDurableObjectId: string;
  }) {
    return this.db.insert(dbSchema.roomResourceShares).values(values);
  }

  deleteShare(nodeId: string, roomId: string, roomDurableObjectId: string) {
    return this.db
      .delete(dbSchema.roomResourceShares)
      .where(
        and(
          eq(dbSchema.roomResourceShares.nodeId, nodeId),
          eq(dbSchema.roomResourceShares.roomId, roomId),
          eq(
            dbSchema.roomResourceShares.roomDurableObjectId,
            roomDurableObjectId,
          ),
        ),
      );
  }
}
