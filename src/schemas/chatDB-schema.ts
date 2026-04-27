import { ROOM_TYPE_NAMES } from "#/roomTypes";
import { users, relations as authRelations } from "./auth-schema";
import { defineRelationsPart } from "drizzle-orm";
import {
  int,
  sqliteTable,
  text,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export { accounts, sessions, users, verifications } from "./auth-schema";

export const rooms = sqliteTable("rooms", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  created_by_user_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "no action" }),
  created_time: int().notNull(),
  type: text({ enum: ROOM_TYPE_NAMES }).notNull(),
  config: text({ mode: "json" }),
  durableObjectId: text(),
  deleted_time: int(),
  theme: text(),
});

export const files = sqliteTable(
  "files",
  {
    id: text().primaryKey(),
    owner_user_id: text()
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    parent_folder_id: text().references(() => folders.id, {
      onDelete: "cascade",
    }),
    name: text().notNull(),
    content_type: text().notNull(),
    size_bytes: int().notNull(),
    r2_key: text().notNull(),
    status: text({ enum: ["pending", "ready"] }).notNull(),
    created_time: int().notNull(),
    deleted_time: int(),
  },
  (table) => [
    index("owner_user_id_idx").on(table.owner_user_id),
    index("parent_folder_id_idx").on(table.parent_folder_id),
    index("name_idx").on(table.name),
    index("size_bytes_idx").on(table.size_bytes),
    index("status_idx").on(table.status),
    index("created_time_idx").on(table.created_time),
    index("deleted_time_idx").on(table.deleted_time),
  ],
);

export const folders = sqliteTable(
  "folders",
  {
    id: text().primaryKey(),
    owner_user_id: text().references(() => users.id, { onDelete: "no action" }),
    parent_folder_id: text().references((): AnySQLiteColumn => folders.id, {
      onDelete: "cascade",
    }),
    name: text().notNull(),
    created_time: int().notNull(),
    deleted_time: int(),
  },
  (table) => [
    index("name_idx").on(table.name),
    index("parent_folder_id_idx").on(table.parent_folder_id),
    index("created_time_idx").on(table.created_time),
    index("deleted_time_idx").on(table.deleted_time),
  ],
);

export const roomResourceShares = sqliteTable(
  "room_resource_shares",
  {
    id: text().primaryKey(),
    room_id: text()
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    shared_by_user_id: text()
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    file_id: text().references(() => files.id, { onDelete: "cascade" }),
    folder_id: text().references(() => folders.id, { onDelete: "cascade" }),
    shared_time: int().notNull(),
  },
  (table) => [
    index("room_id_idx").on(table.room_id),
    index("shared_by_user_id_idx").on(table.shared_by_user_id),
    index("file_id_idx").on(table.file_id),
    index("folder_id_idx").on(table.folder_id),
  ],
);

const relationsPart = defineRelationsPart({ users, rooms }, (r) => ({
  rooms: {
    creator: r.one.users({
      from: r.rooms.created_by_user_id,
      to: r.users.id,
    }),
  },
  users: {
    rooms: r.many.rooms({
      from: r.users.id,
      to: r.rooms.created_by_user_id,
    }),
  },
}));

export const relations = { ...authRelations, ...relationsPart };

/*
files: id, owner_user_id, parent_folder_id (nullable), name (display name — filename can be re-named), content_type, size_bytes, r2_key, status (pending / ready), created_time, deleted_time (soft delete to match rooms)
folders: id, owner_user_id, parent_folder_id (nullable), name, created_time, deleted_time

room_resource_shares: id, room_id, shared_by_user_id, file_id (nullable), folder_id (nullable), shared_time. CHECK constraint: exactly one of file_id/folder_id set.
Quota: either two new columns on users (storage_quota_bytes, storage_used_bytes) or a sibling user_storage table. I'd inline on users for v1.
*/
