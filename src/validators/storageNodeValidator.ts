import * as z from "zod";

const coreFields = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  parentFolderId: z.string().nullable(),
  createdTime: z.number(),
  deletedTime: z.number().nullable(),
  sizeBytes: z.number(),
});

export const storageNodeValidator = z.discriminatedUnion("kind", [
  coreFields.extend({
    kind: z.literal("folder"),
  }),
  coreFields.extend({
    kind: z.literal("file"),
    contentType: z.string(),
    thumbnailContentType: z.string().nullable(),
    thumbnailSizeBytes: z.number().nullable(),
  }),
]);

/**
 * This is the new general-purpose type for slinging node info to the client.
 * Unlike the database type, it's a more standard discriminated union. This
 * should be used throughout FileManager where we're using "FileNode" at the
 * moment. It should also be used for shared file info going forwards.
 */
export type StorageNode = z.infer<typeof storageNodeValidator>;

export type FileStorageNode = Extract<StorageNode, { kind: "file" }>;

export function isFileStorageNode(node: StorageNode): node is FileStorageNode {
  return node.kind === "file";
}
