import { db } from "#/db";
import { rooms } from "#/schemas/coreD1-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { eq } from "drizzle-orm";

export const adminSetRoomDeleted = defineAction({
  input: z.object({
    roomId: z.string(),
    deleted: z.boolean(),
  }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user || user.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    await db
      .update(rooms)
      .set({ deleted_time: input.deleted ? Date.now() : null })
      .where(eq(rooms.id, input.roomId));

    const [updated] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, input.roomId))
      .limit(1);

    return { room: updated };
  },
});
