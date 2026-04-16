import { db } from "#/db";
import { Rooms } from "#/schemas/chatDB-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { and, eq } from "drizzle-orm";

export const deleteRoom = defineAction({
  input: z.object({ roomId: z.string() }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) return new Response("Unauthorized", { status: 401 });
    await db
      .update(Rooms)
      .set({ deleted_time: Date.now() })
      .where(
        and(
          eq(Rooms.id, input.roomId),
          eq(Rooms.created_by_user_id, user.id),
        ),
      );
    return { success: true };
  },
});
