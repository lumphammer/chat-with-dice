import { ROOM_TYPE_NAMES } from "#/roomTypes";
import { users, relations as authRelations } from "./auth-schema";
import { defineRelationsPart } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
