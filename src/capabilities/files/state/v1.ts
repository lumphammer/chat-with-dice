import * as z from "zod/v4";

export const filesStateValidatorV1 = z.object({
  shares: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        name: z.string(),
        kind: z.literal("file"),
        nodeId: z.string(),
        userId: z.string(),
        userDisplayName: z.string(),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable().nullable(),
      }),
      z.object({
        name: z.string(),
        kind: z.literal("folder"),
        nodeId: z.string(),
        userId: z.string(),
        userDisplayName: z.string(),
      }),
    ]),
  ),
});
