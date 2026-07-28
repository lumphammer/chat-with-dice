import { fixStringTimestampThatShouldBeEpochMs } from "#/utils/fixStringTimestampThatShouldBeEpochMs.ts";
import type { filesStateValidatorV3 } from "./v3";
import * as z from "zod/v4";

// Frozen copy of storageNodeValidator's shape as it was before the Deck bump
// (no `isDeck`). Historical versions (V4, V5) must keep validating exactly
// what was actually stored under them, so they can't follow
// storageNodeValidator's `isDeck` bump — that's what filesStateValidatorV6 and
// migrateStateV5ToV6 are for.
const storageNodeCoreFieldsV1 = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  parentFolderId: z.string().nullable(),
  createdTime: z.preprocess(fixStringTimestampThatShouldBeEpochMs, z.number()),
  deletedTime: z.number().nullable(),
  sizeBytes: z.number(),
});

export const storageNodeValidatorV1 = z.discriminatedUnion("kind", [
  storageNodeCoreFieldsV1.extend({
    kind: z.literal("folder"),
  }),
  storageNodeCoreFieldsV1.extend({
    kind: z.literal("file"),
    contentType: z.string(),
    thumbnailContentType: z.string().nullable(),
    thumbnailSizeBytes: z.number().nullable(),
  }),
]);

/**
 * What the owner's file store hands back when a node is shared, and what a
 * Shared Item Message carries, as it was before the Deck bump (`node` has no
 * `isDeck`). Frozen for V4/V5, which must keep validating exactly what was
 * actually stored under them.
 */
export const sharedItemValidatorV1 = z.object({
  userId: z.string(),
  userDisplayName: z.string(),
  dateShared: z.preprocess(fixStringTimestampThatShouldBeEpochMs, z.number()),
  node: storageNodeValidatorV1,
});

export const filesStateValidatorV4 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(4),
  shares: z.array(sharedItemValidatorV1),
});

export const migrateStateV3ToV4 = (
  v3: z.infer<typeof filesStateValidatorV3>,
): z.infer<typeof filesStateValidatorV4> => ({
  // oxlint-disable-next-line no-magic-numbers
  version: 4,
  shares: v3.shares.map((v3Share) => ({
    dateShared: v3Share.dateShared,
    userDisplayName: v3Share.userDisplayName,
    userId: v3Share.userId,
    node:
      v3Share.kind === "folder"
        ? {
            kind: "folder",
            version: 1,
            id: v3Share.nodeId,
            name: v3Share.name,
            parentFolderId: "",
            createdTime: 1,
            deletedTime: null,
            sizeBytes: 0,
          }
        : {
            kind: "file",
            version: 1,
            id: v3Share.nodeId,
            name: v3Share.name,
            parentFolderId: "",
            createdTime: 1,
            deletedTime: null,
            contentType: v3Share.contentType ?? "application/octet-stream",
            thumbnailContentType: v3Share.thumbnailR2Key ? "image/webp" : null,
            thumbnailSizeBytes: v3Share.thumbnailR2Key ? 1 : null,
            sizeBytes: v3Share.sizeBytes,
          },
  })),
});
