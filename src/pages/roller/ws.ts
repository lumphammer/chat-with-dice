import { db } from "#/db";
import { rooms } from "#/schemas/chatDB-schema";
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

export const GET: APIRoute = async ({ url, request, locals }) => {
  const roomId = url.searchParams.get("roomId");
  if (!roomId) return new Response("roomId is required", { status: 400 });

  const user = locals.user;
  if (!user) {
    return new Response("No session found", { status: 401 });
  }

  // confirm that room exists in d1 (without this, technically you could
  // create arbitrary new rooms from any id.)
  const roomExists =
    (
      await db
        .select({ n: sql<number>`1` })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1)
        .all()
    ).length > 0;
  if (!roomExists) {
    return new Response("Room does not exist", { status: 404 });
  }

  // Get the ChatRoom Durable Object stub
  const ChatRoomNamespace = env.CHAT_ROOM_DO;
  if (!ChatRoomNamespace)
    return new Response("CHAT_ROOM_DO binding not found", { status: 500 });
  const durableObjectStub = ChatRoomNamespace.getByName(roomId);

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

  return durableObjectStub.fetch(new Request(fetchUrl, request));
};
