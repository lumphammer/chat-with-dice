import { defineRelations, sql } from "drizzle-orm";
import {
  int,
  text,
  check,
  uniqueIndex,
  snakeCase,
  unique,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const folders = snakeCase.table("folders", {
  id: text()
    .primaryKey()
    .references((): AnySQLiteColumn => nodes.id, {
      onDelete: "cascade",
    }),
  recursiveSizeBytes: int().notNull(),
});

export const files = snakeCase.table("files", {
  id: text()
    .primaryKey()
    .references((): AnySQLiteColumn => nodes.id, {
      onDelete: "cascade",
    }),
  sizeBytes: int().notNull(),
  isReady: int().notNull().default(0),
  r2Key: text().notNull(),
  contentType: text().notNull(),
  thumbnailR2Key: text(),
  thumbnailContentType: text(),
  thumbnailSizeBytes: int(),
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
      .default(sql`(unixepoch(CURRENT_TIMESTAMP) * 1000)`),
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

export const decks = snakeCase.table("decks", {
  id: text()
    .primaryKey()
    .references((): AnySQLiteColumn => folders.id, {
      onDelete: "cascade",
    }),
});

export const roomResourceShares = snakeCase.table(
  "room_resource_shares",
  {
    id: text().primaryKey(),
    roomId: text().notNull(),
    roomDurableObjectId: text().notNull(),
    nodeId: text()
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    sharedTime: int()
      .notNull()
      .default(sql`(unixepoch(CURRENT_TIMESTAMP) * 1000)`),
  },
  (table) => [
    unique("room_resource_shares__room_id__node_id_idx").on(
      table.roomId,
      table.nodeId,
    ),
  ],
);

export const relations = defineRelations(
  { nodes, files, folders, decks, roomResourceShares },
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
      shares: r.many.roomResourceShares({
        from: r.nodes.id,
        to: r.roomResourceShares.nodeId,
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
      deck: r.one.decks({
        from: r.folders.id,
        to: r.decks.id,
      }),
    },
    decks: {
      folder: r.one.folders({
        from: r.decks.id,
        to: r.folders.id,
      }),
    },
    roomResourceShares: {
      node: r.one.nodes({
        from: r.roomResourceShares.nodeId,
        to: r.nodes.id,
        optional: false,
      }),
    },
  }),
);
