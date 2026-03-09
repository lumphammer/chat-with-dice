import type { User } from "#/auth";
import { db } from "#/db";
import { users, Rooms } from "#/schemas/chatDB-schema";
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

async function validateChatId(user: User | null, chatId: string) {
  if (user && user.chatId === chatId) {
    return true;
  }
  const chatIdIsNotUsedByAnAccount =
    (
      await db
        .select({ n: sql<number>`1` })
        .from(users)
        .where(eq(users.chatId, chatId))
        .limit(1)
        .all()
    ).length === 0;

  return chatIdIsNotUsedByAnAccount;
}

export const GET: APIRoute = async ({ url, request, locals }) => {
  const roomId = url.searchParams.get("roomId");
  const chatId = url.searchParams.get("chatId");
  if (!roomId) return new Response("roomId is required", { status: 400 });
  if (!chatId) return new Response("chatId is required", { status: 400 });

  const user = locals.user;
  const chatIdOkay = await validateChatId(user, chatId);
  if (!chatIdOkay)
    return new Response("chatId is not available", { status: 400 });

  // confirm that room exists in d1
  const roomExists =
    (
      await db
        .select({ n: sql<number>`1` })
        .from(Rooms)
        .where(eq(Rooms.id, roomId))
        .limit(1)
        .all()
    ).length > 0;
  if (!roomExists) return new Response("room does not exist", { status: 400 });

  // Get the ChatRoom Durable Object namespace
  const RollerNamespace = env.DiceRollerRoom;
  if (!RollerNamespace)
    return new Response("Roller binding not found", { status: 500 });
  // Get a Durable Object ID for this room
  // idFromName ensures the same room ID always maps to the same Durable Object
  const durableObjectId = RollerNamespace.idFromName(roomId);
  // Get a stub (reference) to the Durable Object
  const durableObjectStub = RollerNamespace.get(durableObjectId);
  // request.url
  return durableObjectStub.fetch(request);
};
