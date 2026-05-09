import { users } from "./auth-schema";
import { rooms } from "./roomSchema";
import { sql } from "drizzle-orm";
import {
  int,
  text,
  index,
  check,
  uniqueIndex,
  snakeCase,
} from "drizzle-orm/sqlite-core";

export type FolderSelect = typeof folders.$inferSelect;
export type FileSelect = typeof files.$inferSelect;

export type NodeSelect = typeof nodes.$inferSelect;

// I'm leaving the SQL originals in here for the time being because I know they
// work, so if there's any difference in how I've adapted to Drizzle we can
// compare and contrast. Delete the SQL originals when we start modifying the
// schemas in future.

/*
CREATE TABLE `folders` (
  `id` text PRIMARY KEY NOT NULL,
  -- this should always be in sync with its children
  `recursive_size_bytes` integer NOT NULL
);
*/

export const folders = snakeCase.table("folders", {
  id: text().primaryKey(),
  recursiveSizeBytes: int().notNull(),
});

/*
CREATE TABLE `files` (
  `id` text PRIMARY KEY NOT NULL,
  `size_bytes` integer NOT NULL,
  `is_ready` integer NOT NULL DEFAULT 0,
  `r2_key` text NOT NULL,
  `content_type` text NOT NULL
);
*/

export const files = snakeCase.table("files", {
  id: text().primaryKey(),
  sizeBytes: int().notNull(),
  isReady: int().notNull().default(0),
  r2Key: text().notNull(),
  contentType: text().notNull(),
});

/*
CREATE TABLE `nodes` (
  `id` text PRIMARY KEY NOT NULL,
  'owner_user_id' text NOT NULL,
  `name` text NOT NULL,
  `parent_folder_id` text,
  `created_time` integer NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_time` integer,
  -- indicate node type by having an id here
  `folder_id` text,
  `file_id` text,
  -- unique index on parent and name: can't have two children of the same folder
  -- sharing a name
  UNIQUE (`parent_folder_id`, `name`),
  UNIQUE (`folder_id`),
  UNIQUE (`file_id`),
  -- constrain that we use the same id string for the node and its child
  CONSTRAINT `id_equals_metadata_fk` CHECK (
    (
      (`file_id` IS NOT NULL)
      AND (`id` == `file_id`)
    )
    OR (
      (`folder_id` IS NOT NULL)
      AND (`id` == `folder_id`)
    )
  ),
  -- constrain that there is only ever file_id or folder_id, not neither or both
  CONSTRAINT `nodes__file_id_or_folder_id` CHECK (
    (
      `file_id` IS NOT NULL
      AND `folder_id` IS NULL
    )
    OR (
      `file_id` IS NULL
      AND `folder_id` IS NOT NULL
    )
  ),
  -- parent is a reference to the folders table
  CONSTRAINT `nodes__parent_folder_id_to_folder_id_fk` FOREIGN KEY (`parent_folder_id`) REFERENCES `folders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `nodes__folder_id__to__folders__id__fk` FOREIGN KEY (`folder_id`) REFERENCES `folders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `nodes__file_id__to__files__id__fk` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE,
  CONSTRAINT `nodes__owner__to__users__id__fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
*/

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
    ownerUserId: text().references(() => users.id, { onDelete: "cascade" }),
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
    roomId: text()
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
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
