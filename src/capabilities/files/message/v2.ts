import { filesStateValidatorV3 } from "../state/v3";
import type { sharedItemMessageDataValidatorV1 } from "./v1";
import * as z from "zod/v4";

export const sharedItemMessageDataValidatorV2 =
  filesStateValidatorV3.shape.shares.element;

export const migrateMessageV1ToV2 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV1>,
): z.infer<typeof sharedItemMessageDataValidatorV2> => {
  if (data.kind === "file") {
    return {
      ...data,
      dateShared: 0,
      r2Key: "/some/fake/r2Key",
    };
  } else {
    return {
      ...data,
      dateShared: 0,
    };
  }
};
