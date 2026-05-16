import { int, text, snakeCase } from "drizzle-orm/sqlite-core";

export const Messages = snakeCase.table("Messages", {
  /** Primary key */
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** Display name of the user at the time they sent the message */
  displayName: text().notNull(),
  /** ID of the user, used for differentiation */
  userId: text().notNull(),
  /** When the message was created */
  createdTime: int().notNull(),
  /** The type of the roll - none, formula, havoc etc */
  rollType: text(),
  /** Either a dice formula or JSON */
  formula: text({ mode: "json" }),
  /** Structured JSON results, either from rpg die roller, or our own */
  results: text({ mode: "json" }),
  /** Chat text */
  chat: text(),
  /** Metadata for the first previewable URL in the chat text */
  linkPreview: text({ mode: "json" }),
});

export const SharedNodes = snakeCase.table("shared_nodes", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text().notNull(),
  // roomId: text().notNull(),
  nodeId: text().notNull(),
  kind: text({ enum: ["file", "folder"] }).notNull(),
  r2Key: text(),
});
