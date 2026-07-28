import * as z from "zod/v4";

export const sharedItemMessageDataValidatorV1 = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    nodeId: z.string(),
    name: z.string(),
    userId: z.string(),
    userDisplayName: z.string(),
    contentType: z.string().nullable(),
    sizeBytes: z.int(),
    thumbnailR2Key: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("folder"),
    nodeId: z.string(),
    name: z.string(),
    userId: z.string(),
    userDisplayName: z.string(),
  }),
]);
