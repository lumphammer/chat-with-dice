import { coreFieldsV2Validator, filesStateValidatorV2 } from "./v2";
import * as z from "zod/v4";

const coreFieldsV3Validator = coreFieldsV2Validator;

export const filesStateValidatorV3 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(3),
  shares: z.array(
    z.discriminatedUnion("kind", [
      coreFieldsV3Validator.extend({
        kind: z.literal("file"),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable(),
        sizeBytes: z.int(),
      }),
      coreFieldsV3Validator.extend({
        kind: z.literal("folder"),
      }),
    ]),
  ),
});

export const migrateStateV2ToV3 = (
  v2: z.infer<typeof filesStateValidatorV2>,
): z.infer<typeof filesStateValidatorV3> => ({
  version: 3,
  shares: v2.shares.map((s) =>
    s.kind === "file" ? { ...s, sizeBytes: 0 } : s,
  ),
});
