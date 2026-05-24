import { db } from "#/db";
import { users } from "#/schemas/auth-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { eq } from "drizzle-orm";

export const adminUpdateUserQuota = defineAction({
  input: z.object({
    userId: z.string(),
    storageQuotaBytes: z.number().int().nonnegative(),
  }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user || user.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    await db
      .update(users)
      .set({ storage_quota_bytes: input.storageQuotaBytes })
      .where(eq(users.id, input.userId));

    return { ok: true };
  },
});
