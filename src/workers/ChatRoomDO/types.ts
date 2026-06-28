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

/**
 * A user currently connected to a room. Derived server-side from the live
 * WebSocket set (see `Broadcaster#getUsersOnline`) and fed to capabilities via
 * the `onPresenceChange` hook. Purely server-side presence input — the client
 * gets its user shapes from capability state, not from this type.
 */
export type OnlineUser = {
  displayName: string;
  userId: string;
  isAnonymous: boolean;
  image?: string;
};

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
