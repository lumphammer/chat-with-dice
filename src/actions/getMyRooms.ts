import { db } from "#/db";
import { Rooms } from "#/schemas/chatDB-schema";
import { defineAction } from "astro:actions";
import { and, desc, eq, isNull } from "drizzle-orm";

const MAX_RECENT_ROOMS = 50;

export const getMyRooms = defineAction({
  handler: async (_input, context) => {
    // Get the ChatRoom Durable Object namespace
    const user = context.locals.user;
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await db
      .select()
      .from(Rooms)
      .where(
        and(
          eq(Rooms.created_by_user_id, user.id),
          isNull(Rooms.deleted_time),
        ),
      )
      .orderBy(desc(Rooms.created_time))
      .limit(MAX_RECENT_ROOMS);
    return result;
  },
});
