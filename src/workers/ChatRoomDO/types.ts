import * as dbSchema from "#/schemas/ChatRoomDO-schema";
import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { z } from "zod/v4";

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
  | {
      result: "existing" | "created";
      node: StorageNode;
    };

export type NodeUnshareResult =
  | {
      result: "removed" | "not-found";
    }
  | {
      result: "error";
      reason: string;
    };
