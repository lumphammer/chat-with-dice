import { Rooms } from "../schemas/chatDB-schema";
import { db } from "@/db";
import { defineAction } from "astro:actions";
import { desc, eq } from "drizzle-orm";

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
      .where(eq(Rooms.created_by_user_id, user.id))
      .orderBy(desc(Rooms.created_time))
      .limit(MAX_RECENT_ROOMS);
    return result;
  },
});
