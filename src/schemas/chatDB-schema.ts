import { ROOM_TYPES } from "#/constants";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

export const Rooms = sqliteTable("Rooms", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  created_by_user_id: text().notNull(),
  created_time: int().notNull(),
  type: text({ enum: ROOM_TYPES }).notNull(),
});
