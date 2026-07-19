import migrations from "#/durable-object-migrations/UserDataDO/migrations.js";
import * as dbSchema from "#/schemas/UserDataDO-schema";
import { setupDB } from "../utils/setupDB";
import type { DbNode } from "./DbNodeType";
import { logError } from "./utils";
import { and, count, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

type DBHandle = DrizzleSqliteDODatabase<
  typeof dbSchema,
  typeof dbSchema.relations
>;

export type PathWalkRow = { folder_id: string; depth: number };

export type FolderSizeDiscrepancyRow = {
  folder_id: string;
  name: string;
  deleted_time: number | null;
  stored: number;
  expected: number;
};

/** A share row plus whether it is currently viewable from its room. */
export type ShareAvailabilityRow = {
  node_id: string;
  room_id: string;
  room_durable_object_id: string;
  /** SQLite has no boolean: `EXISTS` yields 1 or 0. */
  unavailable: number;
};

/**
 * A share reduced to what routing a *removal* notification needs: which node
 * went, and which room DO to tell. No availability, because a hard delete is
 * unconditional — the share is gone, not merely hidden.
 */
export type ShareRemovalRow = {
  node_id: string;
  room_durable_object_id: string;
};

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

  /**
   * Integrity check: find live folders whose stored `recursive_size_bytes`
   * doesn't equal the sum of its direct live children's contributions (ready
   * file → `size_bytes`, subfolder → that subfolder's `recursive_size_bytes`).
   *
   * This is the local invariant `adjustAncestorSizes` is supposed to maintain.
   * If every folder passes, the whole tree is consistent; a failing row points
   * at the exact folder whose accounting drifted.
   */
  findFolderSizeDiscrepancies(): FolderSizeDiscrepancyRow[] {
    const result = this.db.run(sql`
      SELECT
        f.id AS folder_id,
        fn.name AS name,
        fn.deleted_time AS deleted_time,
        f.recursive_size_bytes AS stored,
        COALESCE(SUM(
          CASE
            WHEN cf.id IS NOT NULL AND cf.is_ready = 1 THEN cf.size_bytes
            WHEN cfo.id IS NOT NULL THEN cfo.recursive_size_bytes
            ELSE 0
          END
        ), 0) AS expected
      FROM folders f
      JOIN nodes fn ON fn.folder_id = f.id
      LEFT JOIN nodes child
        ON child.parent_folder_id = f.id AND child.deleted_time IS NULL
      LEFT JOIN files cf ON cf.id = child.file_id
      LEFT JOIN folders cfo ON cfo.id = child.folder_id
      GROUP BY f.id, fn.name, f.recursive_size_bytes
      HAVING f.recursive_size_bytes <> COALESCE(SUM(
        CASE
          WHEN cf.id IS NOT NULL AND cf.is_ready = 1 THEN cf.size_bytes
          WHEN cfo.id IS NOT NULL THEN cfo.recursive_size_bytes
          ELSE 0
        END
      ), 0)
    `);

    return result.toArray() as FolderSizeDiscrepancyRow[];
  }

  countFolders(): number {
    const result = this.db.run(sql`
      SELECT COUNT(*) AS total
      FROM folders
    `);
    const row = result.toArray().at(0);
    return typeof row?.total === "number" ? row.total : 0;
  }

  /**
   * Rebuild every folder's recursive size from the live descendant file rows.
   *
   * Deleted folder rows are still recalculated for their own internal
   * consistency, but deleted child nodes are never counted toward their parent.
   */
  recalculateAllFolderSizes(): number {
    const folderCount = this.countFolders();

    this.db.run(sql`
      WITH RECURSIVE folder_descendants(folder_id, descendant_node_id) AS (
        SELECT
          f.id,
          child.id
        FROM folders f
        JOIN nodes child
          ON child.parent_folder_id = f.id
          AND child.deleted_time IS NULL
        UNION ALL
        SELECT
          fd.folder_id,
          child.id
        FROM folder_descendants fd
        JOIN nodes descendant
          ON descendant.id = fd.descendant_node_id
        JOIN nodes child
          ON child.parent_folder_id = descendant.folder_id
          AND child.deleted_time IS NULL
        WHERE descendant.folder_id IS NOT NULL
      ),
      computed_sizes AS (
        SELECT
          f.id AS folder_id,
          COALESCE(SUM(
            CASE
              WHEN files.id IS NOT NULL AND files.is_ready = 1 THEN files.size_bytes
              ELSE 0
            END
          ), 0) AS recursive_size_bytes
        FROM folders f
        LEFT JOIN folder_descendants fd
          ON fd.folder_id = f.id
        LEFT JOIN nodes descendant
          ON descendant.id = fd.descendant_node_id
        LEFT JOIN files
          ON files.id = descendant.file_id
        GROUP BY f.id
      )
      UPDATE folders
      SET recursive_size_bytes = (
        SELECT computed_sizes.recursive_size_bytes
        FROM computed_sizes
        WHERE computed_sizes.folder_id = folders.id
      )
    `);

    return folderCount;
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
  async getNode(
    nodeId: string,
    { include = "live" }: { include?: "deleted" | "live" | "all" } = {},
  ): Promise<DbNode | undefined> {
    return await this.db.query.nodes.findFirst({
      where: {
        id: nodeId,
        deletedTime:
          include === "all"
            ? undefined
            : include === "deleted"
              ? { isNotNull: true }
              : { isNull: true },
      },
      with: {
        file: true,
        folder: { with: { deck: true } },
      },
    });
  }

  getNodes(
    nodeIds: string[],
    { include = "live" }: { include?: "deleted" | "live" | "all" } = {},
  ) {
    return this.db.query.nodes.findMany({
      where: {
        id: { in: nodeIds },
        deletedTime:
          include === "live"
            ? { isNull: true }
            : include === "deleted"
              ? { isNotNull: true }
              : undefined,
      },
      with: {
        file: true,
        folder: { with: { deck: true } },
      },
    });
  }

  /**
   * Find a non-deleted node by id, with its file relation restricted to ready
   * files. If the node has a file that isn't ready, the relation comes back
   * null.
   */
  getFileNode(
    nodeId: string,
    { include = "live" }: { include?: "deleted" | "live" | "all" } = {},
  ) {
    return this.db.query.nodes.findFirst({
      where: {
        id: nodeId,
        deletedTime:
          include === "live"
            ? { isNull: true }
            : include === "deleted"
              ? { isNotNull: true }
              : undefined,
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
  getChildNodes(folderId: string | null | undefined, includeDeleted: boolean) {
    return this.db.query.nodes.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedTime: { isNull: true } }),
        parentFolderId: folderId ?? { isNull: true },
      },
      with: {
        file: true,
        folder: { with: { deck: true } },
      },
    });
  }

  /**
   * Every file row with its node (for `name`/`deletedTime`), regardless of
   * soft-delete. Used to reconcile the file table against R2 — soft-deleted
   * files keep their row and blob, so they must still count as "referenced".
   */
  getAllFiles() {
    return this.db.query.files.findMany({
      with: { node: true },
    });
  }

  getFileRecord(id: string) {
    return this.db.query.files.findFirst({
      where: { id },
      with: { node: true },
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

  softDeleteNode(nodeId: string) {
    return this.db
      .update(dbSchema.nodes)
      .set({ deletedTime: Date.now() })
      .where(eq(dbSchema.nodes.id, nodeId));
  }

  restoreNode(nodeId: string) {
    return this.db
      .update(dbSchema.nodes)
      .set({ deletedTime: null })
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

  markFolderAsDeck(folderId: string) {
    return this.db
      .insert(dbSchema.decks)
      .values({ id: folderId })
      .onConflictDoNothing();
  }

  unmarkFolderAsDeck(folderId: string) {
    return this.db
      .delete(dbSchema.decks)
      .where(eq(dbSchema.decks.id, folderId));
  }

  /**
   * Set (or clear, with `null`) a Deck's Common Back. The caller has already
   * confirmed the folder is a Deck and that `backNodeId` is one of its live
   * image children, so this only touches the stored id.
   */
  setDeckCommonBack(folderId: string, backNodeId: string | null) {
    return this.db
      .update(dbSchema.decks)
      .set({ commonBackId: backNodeId })
      .where(eq(dbSchema.decks.id, folderId));
  }

  /** The stored front→Individual Back pairings for a Deck. */
  getDeckIndividualBacks(deckId: string) {
    return this.db.query.deckIndividualBacks.findMany({
      where: { deckId },
    });
  }

  /**
   * Pair a Deck's front Card Image with an Individual Back, replacing any
   * existing back for that front. The caller (`UserDataDO.setDeckIndividualBack`)
   * has already validated both ids against the Deck's derived Card state.
   *
   * A back image serves exactly one Card (CONTEXT.md), so any prior pairing that
   * used `backId` for a *different* front is cleared first, then the upsert makes
   * `frontId` point at `backId`. The front's own row is left to the upsert, so an
   * idempotent re-set of an existing `frontId → backId` pairing never deletes the
   * live row it is re-affirming. Because the caller also rejects a `backId` still
   * in use by another *live* front, that delete only ever clears an *inert* row
   * (one whose front image was since deleted) — so although the delete and upsert
   * are two statements (this DO's Drizzle build cannot wrap them in a
   * transaction), a failure between them cannot lose a live pairing: the only row
   * the delete can remove was already resolving to nothing.
   */
  async setDeckIndividualBack(deckId: string, frontId: string, backId: string) {
    await this.db
      .delete(dbSchema.deckIndividualBacks)
      .where(
        and(
          eq(dbSchema.deckIndividualBacks.deckId, deckId),
          eq(dbSchema.deckIndividualBacks.backId, backId),
          ne(dbSchema.deckIndividualBacks.frontId, frontId),
        ),
      );
    await this.db
      .insert(dbSchema.deckIndividualBacks)
      .values({ deckId, frontId, backId })
      .onConflictDoUpdate({
        target: [
          dbSchema.deckIndividualBacks.deckId,
          dbSchema.deckIndividualBacks.frontId,
        ],
        set: { backId },
      });
  }

  /** Remove a front's Individual Back pairing, if it has one. */
  removeDeckIndividualBack(deckId: string, frontId: string) {
    return this.db
      .delete(dbSchema.deckIndividualBacks)
      .where(
        and(
          eq(dbSchema.deckIndividualBacks.deckId, deckId),
          eq(dbSchema.deckIndividualBacks.frontId, frontId),
        ),
      );
  }

  /** Set whether a Deck permits Face Down draws. */
  setDeckAllowFaceDown(folderId: string, allowFaceDown: boolean) {
    return this.db
      .update(dbSchema.decks)
      .set({ allowFaceDown: allowFaceDown ? 1 : 0 })
      .where(eq(dbSchema.decks.id, folderId));
  }

  /** Set whether a Deck permits Inverted draws. */
  setDeckAllowInverted(folderId: string, allowInverted: boolean) {
    return this.db
      .update(dbSchema.decks)
      .set({ allowInverted: allowInverted ? 1 : 0 })
      .where(eq(dbSchema.decks.id, folderId));
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

  clearFileThumbnails(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    return this.db
      .update(dbSchema.files)
      .set({
        thumbnailR2Key: null,
        thumbnailContentType: null,
        thumbnailSizeBytes: null,
      })
      .where(inArray(dbSchema.files.id, ids));
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
   *
   * A node in the trash is not reachable, and neither is one *shadowed* by a
   * deleted ancestor — deleting a folder puts everything under it in the trash,
   * including any shared folder, so the grant stops applying even though the
   * share row survives (soft delete is reversible, so the row has to). That is
   * why the walk runs to the root collecting `deleted_time` rather than
   * filtering deleted nodes out: filtering only *stops* the walk, which still
   * matches a share sitting below the deleted ancestor.
   */
  isNodeReachableFromShare(nodeId: string, roomId: string): boolean {
    const result = this.db.run(sql`
      WITH RECURSIVE ancestors (node_id, parent_folder_id, deleted_time) AS (
        SELECT id, parent_folder_id, deleted_time
        FROM nodes
        WHERE id = ${nodeId}
        UNION ALL
        SELECT n.id, n.parent_folder_id, n.deleted_time
        FROM ancestors a
        JOIN nodes n ON n.folder_id = a.parent_folder_id
        WHERE a.parent_folder_id IS NOT NULL
      )
      SELECT 1
      FROM ancestors a
      JOIN room_resource_shares rrs ON rrs.node_id = a.node_id
      WHERE rrs.room_id = ${roomId}
        AND NOT EXISTS (
          SELECT 1 FROM ancestors WHERE deleted_time IS NOT NULL
        )
      LIMIT 1
    `);

    return result.toArray().length > 0;
  }

  // === Deletes ===

  async hardDeleteNodes(ids: string[]) {
    if (ids.length === 0) {
      return;
    }
    // This is dead simple and fail-safe. reciprocal FKs with CASCADE mean that
    // the nodes and all their decendants are wiped off the face of the database.
    this.db.run(sql`PRAGMA foreign_keys = ON`);
    return await this.db
      .delete(dbSchema.nodes)
      .where(inArray(dbSchema.nodes.id, ids));
  }

  // === Shares ===

  findShareWithNode(nodeId: string, roomDurableObjectId: string) {
    return this.db.query.roomResourceShares.findFirst({
      where: { nodeId, roomDurableObjectId },
      with: {
        node: {
          with: { file: true, folder: { with: { deck: true } } },
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

  /**
   * Every share whose node is `nodeId` or a descendant of it, with whether that
   * share is currently viewable from its room.
   *
   * This is the set of shares affected by binning or restoring `nodeId`: the
   * grant may sit on the node itself, or on a shared folder somewhere beneath
   * it that the delete shadows. Availability is recomputed per share rather
   * than assumed from the operation, because a restore only re-exposes a share
   * if no *other* ancestor is still in the trash.
   */
  findSharesAtOrBelow(nodeId: string): ShareAvailabilityRow[] {
    const result = this.db.run(sql`
      WITH RECURSIVE subtree (node_id) AS (
        SELECT id FROM nodes WHERE id = ${nodeId}
        UNION ALL
        SELECT n.id
        FROM subtree s
        JOIN nodes n ON n.parent_folder_id = s.node_id
      ),
      -- Every (share, ancestor-or-self) pair, so a share is unavailable when
      -- any node on its path to the root is in the trash. Mirrors the rule in
      -- isNodeReachableFromShare.
      share_lineage (share_node_id, node_id, parent_folder_id, deleted_time) AS (
        SELECT n.id, n.id, n.parent_folder_id, n.deleted_time
        FROM subtree s
        JOIN room_resource_shares rrs ON rrs.node_id = s.node_id
        JOIN nodes n ON n.id = rrs.node_id
        UNION ALL
        SELECT sl.share_node_id, n.id, n.parent_folder_id, n.deleted_time
        FROM share_lineage sl
        JOIN nodes n ON n.folder_id = sl.parent_folder_id
        WHERE sl.parent_folder_id IS NOT NULL
      )
      SELECT
        rrs.node_id AS node_id,
        rrs.room_id AS room_id,
        rrs.room_durable_object_id AS room_durable_object_id,
        EXISTS (
          SELECT 1 FROM share_lineage sl
          WHERE sl.share_node_id = rrs.node_id
            AND sl.deleted_time IS NOT NULL
        ) AS unavailable
      FROM room_resource_shares rrs
      JOIN subtree s ON s.node_id = rrs.node_id
    `);

    return result.toArray() as ShareAvailabilityRow[];
  }

  /**
   * Every share whose node is one of `nodeIds` or a descendant of one, reduced
   * to the columns needed to tell its room the share is gone.
   *
   * The removal counterpart to {@link findSharesAtOrBelow}: call it *before* the
   * hard delete, because `roomResourceShares.nodeId` cascades and the rows are
   * about to vanish. There is no availability to compute — a hard delete leaves
   * nothing to restore, so every match is dropped unconditionally.
   */
  findSharesAtOrBelowNodes(nodeIds: string[]): ShareRemovalRow[] {
    if (nodeIds.length === 0) {
      return [];
    }
    // `UNION` (not `UNION ALL`) so a node reached from two roots — `nodeIds` can
    // hold both a folder and a separately-binned descendant of it, which the
    // purge reaps together — is walked once, and each share yields one row.
    const result = this.db.run(sql`
      WITH RECURSIVE subtree (node_id) AS (
        SELECT id FROM nodes WHERE id IN ${nodeIds}
        UNION
        SELECT n.id
        FROM subtree s
        JOIN nodes n ON n.parent_folder_id = s.node_id
      )
      SELECT
        rrs.node_id AS node_id,
        rrs.room_durable_object_id AS room_durable_object_id
      FROM room_resource_shares rrs
      JOIN subtree s ON s.node_id = rrs.node_id
    `);

    return result.toArray() as ShareRemovalRow[];
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

  recursivelyGetDescendantR2Keys(nodeIds: string[]): string[] {
    if (nodeIds.length === 0) return [];

    return this.db
      .run(
        sql`
      WITH RECURSIVE descendants(id) AS (
        SELECT id FROM folders WHERE id IN ${nodeIds}
        UNION ALL
        SELECT nodes.id id
        FROM descendants
        INNER JOIN nodes
        ON nodes.parent_folder_id = descendants.id
        WHERE nodes.folder_id IS NOT NULL
      )
      SELECT files.thumbnail_r_2_key thumbnailR2Key, files.r2_key r2Key
      FROM descendants
      INNER JOIN nodes
      ON descendants.id = nodes.parent_folder_id
      INNER JOIN files
      ON nodes.file_id = files.id
      UNION ALL
      SELECT files.thumbnail_r_2_key thumbnailR2Key, files.r2_key r2Key
      FROM files WHERE id IN ${nodeIds}
    `,
      )
      .toArray()
      .flatMap(
        (r) =>
          (r.thumbnailR2Key
            ? [r.thumbnailR2Key, r.r2Key]
            : [r.r2Key]) as string[],
      );
  }

  /**
   * Returns true if the node is shadowed by a deleted folder, i.e. it has a
   * deleted ancestor.
   */
  isNodeShadowedByADeletedFolder(nodeId: string): boolean {
    const result = this.db
      .run(
        sql`
          WITH RECURSIVE ancestors(node_id, deleted_time) AS (
            SELECT nodes.parent_folder_id node_id, NULL
            FROM nodes
            WHERE nodes.id = ${nodeId}
            AND nodes.parent_folder_id IS NOT NULL
            UNION ALL
            SELECT nodes.parent_folder_id node_id, nodes.deleted_time deleted_time
            FROM ancestors
            JOIN nodes ON nodes.folder_id = ancestors.node_id
            WHERE nodes.parent_folder_id IS NOT NULL
          )
          SELECT 1 FROM ancestors WHERE ancestors.deleted_time IS NOT NULL LIMIT 1
        `,
      )
      .toArray();
    return result.length > 0;
  }

  async findDeletedNodeIdsOlderThan(cutoffTime: number) {
    const nodesToDelete = (
      await this.db.query.nodes.findMany({
        where: {
          deletedTime: {
            lte: cutoffTime,
          },
        },
        columns: {
          id: true,
        },
      })
    ).map((node) => node.id);
    return nodesToDelete;
  }

  async getDeletedNodeCount(): Promise<number> {
    const result = await this.db
      .select({
        total: count(dbSchema.nodes.deletedTime),
      })
      .from(dbSchema.nodes);
    return result.at(0)?.total ?? 0;
  }
}
