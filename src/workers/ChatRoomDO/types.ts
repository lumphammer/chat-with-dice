import * as dbSchema from "#/schemas/ChatRoomDO-schema";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { z } from "zod/v4";

// Structured types for the `rolls` JSON column, matching the shape of
// DiceRoll.toJSON().rolls from @dice-roller/rpg-dice-roller

export const sessionAttachmentSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  image: z.string().optional(),
  isAnonymous: z.boolean(),
  createdTime: z.int(),
});

export type SessionAttachment = z.infer<typeof sessionAttachmentSchema>;

export type DBHandle = DrizzleSqliteDODatabase<typeof dbSchema>;

export type NodeShareResult =
  | {
      result: "error";
      reason: string;
    }
  | ({
      result: "existing" | "created";
      name: string;
    } & (
      | {
          kind: "file";
          r2Key: string;
        }
      | {
          kind: "folder";
        }
    ));
