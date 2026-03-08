import { GENERIC_ROOM_TYPE, HAVOC_ROOM_TYPE, ROOM_TYPES } from "#/constants";
import { db } from "#/db";
import { Rooms } from "#/schemas/chatDB-schema";
import type { RoomType } from "#/types";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";
import { nanoid } from "nanoid";

const MIN_ROOM_NAME_LENGTH = 1;
const MAX_ROOM_NAME_LENGTH = 128;

export const createChatWithDiceRoom = defineAction({
  input: z.object({
    roomName: z.string().min(MIN_ROOM_NAME_LENGTH).max(MAX_ROOM_NAME_LENGTH),
    description: z.string().optional(),
    type: z.enum(ROOM_TYPES),
  }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const RollerNamespace = env.DiceRollerRoom;
    if (!RollerNamespace)
      return new Response("Roller binding not found", { status: 500 });
    const roomId = nanoid();
    await db.insert(Rooms).values({
      created_by_user_id: user.id,
      created_time: Date.now(),
      name: input.roomName,
      description: input.description,
      id: roomId,
      type: input.type,
    });
    return { roomId };
  },
});
