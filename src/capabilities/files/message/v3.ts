import { sharedItemValidatorV1 } from "../state/v4";
import type { sharedItemMessageDataValidatorV2 } from "./v2";
import * as z from "zod/v4";

export const sharedItemMessageDataValidatorV3 = sharedItemValidatorV1;

export const migrateMessageV2ToV3 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV2>,
): z.infer<typeof sharedItemMessageDataValidatorV3> => {
  return {
    dateShared: data.dateShared,
    userDisplayName: data.userDisplayName,
    userId: data.userId,
    node:
      data.kind === "folder"
        ? {
            version: 1,
            kind: "folder",
            id: data.nodeId,
            name: data.name,
            parentFolderId: "",
            createdTime: 1,
            deletedTime: null,
            sizeBytes: 1,
          }
        : {
            version: 1,
            kind: "file",
            name: data.name,
            parentFolderId: "",
            contentType: data.contentType ?? "application/octet-stream",
            thumbnailContentType: data.thumbnailR2Key ? "image/webp" : null,
            thumbnailSizeBytes: data.thumbnailR2Key ? 1 : null,
            createdTime: 1,
            deletedTime: null,
            id: data.nodeId,
            sizeBytes: data.sizeBytes,
          },
  };
};
