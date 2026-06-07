import { db } from "#/db";
import { rooms } from "#/schemas/coreD1-schema";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { ActionError } from "astro:actions";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

export const deleteRoom = defineAction({
  input: z.object({ roomId: z.string() }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user)
      throw new ActionError({ message: "Unauthorized", code: "UNAUTHORIZED" });

    const room = await db.query.rooms.findFirst({
      where: { id: input.roomId, createdByUserId: user.id },
    });
    if (!room)
      throw new ActionError({ message: "Room not found", code: "NOT_FOUND" });

    if (room.durableObjectId) {
      const roomDo = env.CHAT_ROOM_DO.get(
        env.CHAT_ROOM_DO.idFromString(room.durableObjectId),
      );

      await roomDo.destroy();
    }

    await db
      .delete(rooms)
      .where(
        and(eq(rooms.id, input.roomId), eq(rooms.createdByUserId, user.id)),
      );
    return { success: true };
  },
});
