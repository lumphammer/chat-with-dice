import { defineRelations, sql } from "drizzle-orm";
import {
  int,
  text,
  index,
  check,
  uniqueIndex,
  snakeCase,
} from "drizzle-orm/sqlite-core";

export const folders = snakeCase.table("folders", {
  id: text().primaryKey(),
  recursiveSizeBytes: int().notNull(),
});

export const files = snakeCase.table("files", {
  id: text().primaryKey(),
  sizeBytes: int().notNull(),
  isReady: int().notNull().default(0),
  r2Key: text().notNull(),
  contentType: text().notNull(),
});

export const nodes = snakeCase.table(
  "nodes",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    parentFolderId: text().references(() => folders.id, {
      onDelete: "cascade",
    }),
    createdTime: int()
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedTime: int(),
    folderId: text().references(() => folders.id, { onDelete: "cascade" }),
    fileId: text().references(() => files.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("nodes_parent_name_live")
      .on(table.parentFolderId, table.name)
      .where(sql`${table.deletedTime} IS NULL`),
    uniqueIndex("nodes_root_name_live")
      .on(table.name)
      .where(
        sql`${table.parentFolderId} IS NULL AND ${table.deletedTime} IS NULL`,
      ),
    check(
      "id_equals_metadata_fk",
      sql`(
        (${table.fileId} IS NOT NULL)
        AND (${table.id} == ${table.fileId})
      )
      OR (
        (${table.folderId} IS NOT NULL)
        AND (${table.id} == ${table.folderId})
      )`,
    ),
    check(
      "nodes__file_id_or_folder_id",
      sql`(
        ${table.fileId} IS NOT NULL
        AND ${table.folderId} IS NULL
      )
      OR (
        ${table.fileId} IS NULL
        AND ${table.folderId} IS NOT NULL
      )`,
    ),
  ],
);

export const roomResourceShares = snakeCase.table(
  "room_resource_shares",
  {
    id: text().primaryKey(),
    roomId: text().notNull(),
    nodeId: text().references(() => nodes.id, { onDelete: "cascade" }),
    sharedTime: int()
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("room_resource_shares__room_id__node_id_idx").on(
      table.roomId,
      table.nodeId,
    ),
  ],
);

export const relations = defineRelations(
  { nodes, files, folders, roomResourceShares },
  (r) => ({
    nodes: {
      file: r.one.files({
        from: r.nodes.fileId,
        to: r.files.id,
      }),
      folder: r.one.folders({
        from: r.nodes.folderId,
        to: r.folders.id,
      }),
      parentFolder: r.one.folders({
        from: r.nodes.parentFolderId,
        to: r.folders.id,
      }),
    },
    files: {
      node: r.one.nodes({
        from: r.files.id,
        to: r.nodes.id,
      }),
    },
    folders: {
      node: r.one.nodes({
        from: r.folders.id,
        to: r.nodes.id,
      }),
    },
  }),
);
