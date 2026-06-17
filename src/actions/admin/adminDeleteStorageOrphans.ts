import { db as d1 } from "#/db";
import { isAdminOrBetterOrThrow } from "#/utils/isAdminOrBetterOrThrow";
import { processInBatches } from "#/utils/processInBatches";
import {
  R2_REPAIR_BATCH_SIZE,
  R2_REPAIR_SUBREQUEST_BUDGET,
} from "#/utils/r2RepairLimits";
import type { R2OrphanCleanupResult } from "#/workers/UserDataDO/types";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

const THUMBNAIL_ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const adminDeleteStorageOrphans = defineAction({
  input: z.object({
    userId: z.string(),
    orphanBlobs: z.array(
      z.object({
        key: z.string(),
        sizeBytes: z.number().int().nonnegative(),
      }),
    ),
  }),
  handler: async ({ userId, orphanBlobs }, context) => {
    isAdminOrBetterOrThrow(context.locals.user?.role);

    const bucket = env.PRIVATE_R2;
    if (!bucket) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "PRIVATE_R2 bucket is not configured",
      });
    }

    const owner = await d1.query.users.findFirst({
      where: { id: userId },
    });
    if (!owner?.user_data_do_id) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "User has no storage",
      });
    }

    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(owner.user_data_do_id),
    );
    const freshReport = await userDataDO.checkR2Reconciliation();
    if (freshReport.kind === "error") {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check storage",
      });
    }
    const freshOrphanKeys = new Set(
      freshReport.data.orphanBlobs.map((blob) => blob.key),
    );

    const result: R2OrphanCleanupResult = {
      generatedAt: Date.now(),
      requested: orphanBlobs.length,
      deleted: 0,
      deferred: 0,
      skipped: [],
      failed: [],
    };

    const seenKeys = new Set<string>();
    const fileKeysToDelete: string[] = [];
    const thumbnailKeysToCheck: string[] = [];
    let remainingR2Subrequests = R2_REPAIR_SUBREQUEST_BUDGET;
    for (const { key } of orphanBlobs) {
      if (seenKeys.has(key)) {
        result.skipped.push({ key, reason: "duplicate" });
        continue;
      }
      seenKeys.add(key);

      const isFileKey = key.startsWith(freshReport.data.prefixes.files);
      const isThumbnailKey = key.startsWith(
        freshReport.data.prefixes.thumbnails,
      );
      if (!isFileKey && !isThumbnailKey) {
        result.skipped.push({ key, reason: "outside-user-prefix" });
        continue;
      }
      if (!freshOrphanKeys.has(key)) {
        result.skipped.push({ key, reason: "not-still-orphaned" });
        continue;
      }

      const subrequestCost = isThumbnailKey ? 2 : 1;
      if (remainingR2Subrequests < subrequestCost) {
        result.skipped.push({ key, reason: "deferred-subrequest-budget" });
        result.deferred++;
        continue;
      }
      remainingR2Subrequests -= subrequestCost;

      if (isThumbnailKey) {
        thumbnailKeysToCheck.push(key);
      } else {
        fileKeysToDelete.push(key);
      }
    }

    const thumbnailChecks = await processInBatches(
      thumbnailKeysToCheck,
      R2_REPAIR_BATCH_SIZE,
      async (key) => ({
        key,
        object: await bucket.head(key),
      }),
    );
    const thumbnailKeysToDelete: string[] = [];
    for (const { key, object } of thumbnailChecks) {
      if (!object) {
        result.skipped.push({ key, reason: "not-found" });
        continue;
      }
      const ageMs = Date.now() - object.uploaded.getTime();
      if (ageMs < THUMBNAIL_ORPHAN_MIN_AGE_MS) {
        result.skipped.push({ key, reason: "thumbnail-too-new" });
        continue;
      }
      thumbnailKeysToDelete.push(key);
    }

    const deleteResults = await processInBatches(
      [...fileKeysToDelete, ...thumbnailKeysToDelete],
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
        result.failed.push({ key, reason: errorMessage(error) });
      } else {
        result.deleted++;
      }
    }

    return result;
  },
});
