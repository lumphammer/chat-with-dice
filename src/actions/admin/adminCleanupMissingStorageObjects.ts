import { db as d1 } from "#/db";
import { processInBatches } from "#/utils/processInBatches";
import {
  R2_REPAIR_BATCH_SIZE,
  R2_REPAIR_SUBREQUEST_BUDGET,
} from "#/utils/r2RepairLimits";
import type {
  MissingBlobCleanupInput,
  MissingStorageCleanupResult,
} from "#/workers/UserDataDO/types";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

const missingBlobInput = z.object({
  nodeId: z.string(),
  r2Key: z.string(),
  kind: z.enum(["file", "thumbnail"]),
});

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const adminCleanupMissingStorageObjects = defineAction({
  input: z.object({
    userId: z.string(),
    missingBlobs: z.array(missingBlobInput),
  }),
  handler: async ({ userId, missingBlobs }, context) => {
    const user = context.locals.user;
    if (!user || user.role !== "admin") {
      throw new Error("Forbidden");
    }

    const owner = await d1.query.users.findFirst({
      where: { id: userId },
    });
    if (!owner?.user_data_do_id) {
      throw new Error("User has no storage");
    }

    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(owner.user_data_do_id),
    );
    const cleanupResult = await userDataDO.cleanupMissingBlobs(
      missingBlobs satisfies MissingBlobCleanupInput[],
    );

    const result: MissingStorageCleanupResult = {
      ...cleanupResult,
      deletedThumbnailObjects: 0,
      thumbnailObjectDeleteFailures: [],
    };

    const thumbnailKeys = new Set(cleanupResult.thumbnailR2KeysToDelete);
    if (thumbnailKeys.size === 0) {
      return result;
    }

    const bucket = env.PRIVATE_R2;
    if (!bucket) {
      throw new Error("PRIVATE_R2 bucket is not configured");
    }

    const thumbnailKeysToDelete = [...thumbnailKeys].slice(
      0,
      R2_REPAIR_SUBREQUEST_BUDGET,
    );
    result.deferred += thumbnailKeys.size - thumbnailKeysToDelete.length;

    const deleteResults = await processInBatches(
      thumbnailKeysToDelete,
      R2_REPAIR_BATCH_SIZE,
      async (key) => {
        try {
          await bucket.delete(key);
          return { key, error: null };
        } catch (error) {
          return { key, error };
        }
      },
    );

    for (const { key, error } of deleteResults) {
      if (error) {
        result.thumbnailObjectDeleteFailures.push({
          key,
          reason: errorMessage(error),
        });
      } else {
        result.deletedThumbnailObjects++;
      }
    }

    return result;
  },
});
