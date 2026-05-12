import { db } from "#/db";
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const GET: APIRoute = async ({ url, request, locals }) => {
  const roomId = url.searchParams.get("roomId");
  if (!roomId) return new Response("roomId is required", { status: 400 });

  const user = locals.user;
  if (!user) {
    return new Response("No session found", { status: 401 });
  }

  // Get the ChatRoom Durable Object stub based on the store do id in d1.
  // This is a funny one - the DO will also check D1 before fully booting, as a
  // safety mechanism. In theory we could always derive the DO id from the room
  // id, but that can cause issues if the DO binding changes (the binding name
  // and/or DO class name are use in the hashing process to create the DO id.)
  const room = await db.query.rooms.findFirst({
    where: {
      id: roomId,
      deleted_time: { isNull: true },
    },
  });
  if (!room || !room.durableObjectId) {
    return new Response("Room not found", { status: 404 });
  }

  const chatRoomDO = env.CHAT_ROOM_DO.get(
    env.CHAT_ROOM_DO.idFromString(room.durableObjectId),
  );

  env.CHAT_ROOM_DO.get(env.CHAT_ROOM_DO.idFromString(room.durableObjectId));

  const fetchUrl = new URL("https://example.com/ws");
  fetchUrl.searchParams.set("userId", user.id);
  fetchUrl.searchParams.set("roomId", roomId);
  fetchUrl.searchParams.set("displayName", user.name);
  if (user.isAnonymous) {
    fetchUrl.searchParams.set("isAnonymous", "true");
  }
  if (user.image) {
    fetchUrl.searchParams.set("image", user.image);
  }

  return chatRoomDO.fetch(new Request(fetchUrl, request));
};
