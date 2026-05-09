import { db } from "#/db";
import { ROOM_TYPE_NAMES, roomTypes } from "#/roomTypes";
import { rooms } from "#/schemas/chatDB-schema";
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
    type: z.enum(ROOM_TYPE_NAMES),
  }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const ChatRoomNamespace = env.CHAT_ROOM_DO;
    if (!ChatRoomNamespace)
      return new Response("CHAT_ROOM_DO binding not found", { status: 500 });

    const roomId = nanoid();

    // Get a Durable Object ID for this room
    // idFromName ensures the same room ID always maps to the same Durable Object
    const durableObjectId = ChatRoomNamespace.idFromName(roomId).toString();

    const config = roomTypes[input.type].config;

    // we *could* use the DO id as the pk, but that feels leaky

    await db.insert(rooms).values({
      created_by_user_id: user.id,
      created_time: Date.now(),
      name: input.roomName,
      description: input.description,
      id: roomId,
      type: input.type,
      config,
      durableObjectId,
    });
    return { roomId };
  },
});
