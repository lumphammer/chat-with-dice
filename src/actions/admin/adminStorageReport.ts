import { db as d1 } from "#/db";
import { isAdminOrBetterOrThrow } from "#/utils/roleHelpers.ts";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const adminStorageReport = defineAction({
  input: z.object({
    userId: z.string(),
  }),
  handler: async ({ userId }, context) => {
    isAdminOrBetterOrThrow(context.locals.user?.role);

    const owner = await d1.query.users.findFirst({
      where: { id: userId },
    });
    if (!owner?.user_data_do_id) {
      throw new Error("User has no storage");
    }

    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(owner.user_data_do_id),
    );

    const [folderReport, r2Report] = await Promise.all([
      userDataDO.checkFolderSizes(),
      userDataDO.checkR2Reconciliation(),
    ]);

    return { folderReport, r2Report };
  },
});
