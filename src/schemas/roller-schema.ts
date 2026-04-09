import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const Messages = sqliteTable("Messages", {
  /** Primary key */
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** Display name of the user at the time they sent the message */
  displayName: text().notNull(),
  /** Chat ID of the user, used for differentiation */
  chatId: text().notNull(),
  /** When the message was created */
  created_time: int().notNull(),
  /** The type of the roll - none, formula, havoc etc */
  rollType: text().notNull(),
  /** Either a dice formula or JSON */
  formula: text({ mode: "json" }),
  /** Structured JSON results, either from rpg die roller, or our own */
  results: text({ mode: "json" }),
  /** Chat text */
  chat: text(),
});
