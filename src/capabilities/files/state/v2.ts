import type { filesStateValidatorV1 } from "./v1";
import * as z from "zod/v4";

export const coreFieldsV2Validator = z.object({
  name: z.string(),
  nodeId: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  dateShared: z.int(),
});

export const filesStateValidatorV2 = z.object({
  version: z.literal(2),
  shares: z.array(
    z.discriminatedUnion("kind", [
      coreFieldsV2Validator.extend({
        kind: z.literal("file"),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable().nullable(),
      }),
      coreFieldsV2Validator.extend({
        kind: z.literal("folder"),
      }),
    ]),
  ),
});

export const migrateStateV1ToV2 = (
  v1: z.infer<typeof filesStateValidatorV1>,
): z.infer<typeof filesStateValidatorV2> => ({
  version: 2,
  shares: v1.shares.map((s) => ({ ...s, dateShared: 0 })),
});
