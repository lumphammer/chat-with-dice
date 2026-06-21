import type { SharedItem } from "#/capabilities/files/common.ts";
import { z } from "zod/v4";

export const sessionAttachmentSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  image: z.string().optional(),
  isAnonymous: z.boolean(),
  createdTime: z.int(),
});

export type SessionAttachment = z.infer<typeof sessionAttachmentSchema>;

export type NodeShareResult =
  | {
      result: "error";
      reason: string;
    }
  | {
      result: "existing" | "created";
      sharedItem: SharedItem;
    };

export type NodeUnshareResult =
  | {
      result: "removed" | "not-found";
    }
  | {
      result: "error";
      reason: string;
    };
