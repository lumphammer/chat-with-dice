import * as dbSchema from "#/schemas/roller-schema";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { z } from "zod/v4";

// Structured types for the `rolls` JSON column, matching the shape of
// DiceRoll.toJSON().rolls from @dice-roller/rpg-dice-roller

export const sessionAttachmentSchema = z.object({
  chatId: z.uuid(),
  userId: z.string().nullable(),
});

export type SessionAttachment = z.infer<typeof sessionAttachmentSchema>;

export type DBHandle = DrizzleSqliteDODatabase<typeof dbSchema>;
