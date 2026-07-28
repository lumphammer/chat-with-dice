import { migrateStorageNodeV1ToV2, sharedItemValidator } from "../state/v6";
import type { sharedItemMessageDataValidatorV3 } from "./v3";
import * as z from "zod/v4";

export const sharedItemMessageDataValidatorV4 = sharedItemValidator;

export const migrateMessageV3ToV4 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV3>,
): z.infer<typeof sharedItemMessageDataValidatorV4> => ({
  ...data,
  node: migrateStorageNodeV1ToV2(data.node),
});
