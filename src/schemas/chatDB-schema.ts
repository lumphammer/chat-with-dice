import { ROOM_TYPE_NAMES } from "#/roomTypes";
import { users, relations as authRelations } from "./auth-schema";
import { defineRelationsPart, sql } from "drizzle-orm";
import {
  int,
  sqliteTable,
  text,
  index,
  type AnySQLiteColumn,
  check,
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
    // denormalized from the parent folder tree for fast user-scoped lookups (e.g. account deletion);
    // must match the root ancestor folder's owner_user_id — enforced in app code
    owner_user_id: text()
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    // files always live in a folder; ownership is derived from the folder tree
    parent_folder_id: text()
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    name: text().notNull(),
    content_type: text().notNull(),
    size_bytes: int().notNull(),
    r2_key: text().notNull(),
    status: text({ enum: ["pending", "ready"] }).notNull(),
    created_time: int().notNull(),
    deleted_time: int(),
  },
  (table) => [
    // (owner, folder) covers fast user-scoped scans (account deletion, quota reconcile)
    // and "list user's files in folder X" — left-prefix handles owner-only queries too
    index("files__owner_user_id__parent_folder_id_idx").on(
      table.owner_user_id,
      table.parent_folder_id,
    ),
    // (folder, name) covers "list folder contents" and name lookups within a folder
    index("files__parent_folder_id__name_idx").on(
      table.parent_folder_id,
      table.name,
    ),
    // (status, created_time) feeds the reconciler: pending rows older than N minutes
    index("files__status__created_time_idx").on(table.status, table.created_time),
    index("files__deleted_time_idx").on(table.deleted_time),
  ],
);

export const folders = sqliteTable(
  "folders",
  {
    id: text().primaryKey(),
    owner_user_id: text()
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    parent_folder_id: text().references((): AnySQLiteColumn => folders.id, {
      onDelete: "cascade",
    }),
    name: text().notNull(),
    created_time: int().notNull(),
    deleted_time: int(),
  },
  (table) => [
    index("folders__owner_user_id_idx").on(table.owner_user_id),
    // (folder, name) covers "list folder contents" and name lookups within a folder;
    // left-prefix also covers plain parent_folder_id lookups
    index("folders__parent_folder_id__name_idx").on(
      table.parent_folder_id,
      table.name,
    ),
    index("folders__created_time_idx").on(table.created_time),
    index("folders__deleted_time_idx").on(table.deleted_time),
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
    // composites align with the ACL recursive CTE: WHERE room_id = ? AND file_id = ?
    // and: WHERE room_id = ? AND folder_id IN (...)
    index("room_resource_shares__room_id__file_id_idx").on(
      table.room_id,
      table.file_id,
    ),
    index("room_resource_shares__room_id__folder_id_idx").on(
      table.room_id,
      table.folder_id,
    ),
    index("room_resource_shares__shared_by_user_id_idx").on(
      table.shared_by_user_id,
    ),
    check(
      "exactly_one_target",
      sql`(${table.file_id} IS NULL) != (${table.folder_id} IS NULL)`,
    ),
  ],
);

const relationsPart = defineRelationsPart(
  { users, rooms, files, folders, roomResourceShares },
  (r) => ({
    rooms: {
      creator: r.one.users({
        from: r.rooms.created_by_user_id,
        to: r.users.id,
      }),
      shares: r.many.roomResourceShares({
        from: r.rooms.id,
        to: r.roomResourceShares.room_id,
      }),
    },
    users: {
      rooms: r.many.rooms({
        from: r.users.id,
        to: r.rooms.created_by_user_id,
      }),
      folders: r.many.folders({
        from: r.users.id,
        to: r.folders.owner_user_id,
      }),
      files: r.many.files({
        from: r.users.id,
        to: r.files.owner_user_id,
      }),
    },
    files: {
      owner: r.one.users({
        from: r.files.owner_user_id,
        to: r.users.id,
      }),
      parentFolder: r.one.folders({
        from: r.files.parent_folder_id,
        to: r.folders.id,
      }),
    },
    folders: {
      owner: r.one.users({
        from: r.folders.owner_user_id,
        to: r.users.id,
      }),
      // self-referential: both sides defined so the relation API can navigate
      // either direction; Drizzle disambiguates via the from/to columns
      parentFolder: r.one.folders({
        from: r.folders.parent_folder_id,
        to: r.folders.id,
      }),
      childFolders: r.many.folders({
        from: r.folders.id,
        to: r.folders.parent_folder_id,
      }),
      files: r.many.files({
        from: r.folders.id,
        to: r.files.parent_folder_id,
      }),
    },
    roomResourceShares: {
      room: r.one.rooms({
        from: r.roomResourceShares.room_id,
        to: r.rooms.id,
      }),
      sharedBy: r.one.users({
        from: r.roomResourceShares.shared_by_user_id,
        to: r.users.id,
      }),
      file: r.one.files({
        from: r.roomResourceShares.file_id,
        to: r.files.id,
      }),
      folder: r.one.folders({
        from: r.roomResourceShares.folder_id,
        to: r.folders.id,
      }),
    },
  }),
);

export const relations = { ...authRelations, ...relationsPart };
