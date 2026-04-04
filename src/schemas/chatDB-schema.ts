import { ROOM_TYPE_NAMES } from "#/roomTypes";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

export const Rooms = sqliteTable("Rooms", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  created_by_user_id: text().notNull(),
  created_time: int().notNull(),
  // need a wee cast here to persuade the drizzle types that the liost of
  // ROOM_TYPE_NAMES is non-empty
  type: text({ enum: ROOM_TYPE_NAMES }).notNull(),
  config: text({ mode: "json" }),
  durableObjectId: text(),
});
