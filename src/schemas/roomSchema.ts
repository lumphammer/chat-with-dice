import { ROOM_TYPE_NAMES } from "#/roomTypes";
import { users } from "./auth-schema";
import { int, text, snakeCase } from "drizzle-orm/sqlite-core";

export const rooms = snakeCase.table("rooms", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  createdByUserId: text()
    .notNull()
    .references(() => users.id, { onDelete: "no action" }),
  createdTime: int().notNull(),
  type: text({ enum: ROOM_TYPE_NAMES }).notNull(),
  config: text({ mode: "json" }),
  durableObjectId: text(),
  deleted_time: int(),
  theme: text(),
});
