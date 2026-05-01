import { ROOM_TYPE_NAMES } from "#/roomTypes";
import { users } from "./auth-schema";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
