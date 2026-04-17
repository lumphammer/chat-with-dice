import { db } from "#/db";
import { rooms } from "#/schemas/chatDB-schema";
import { roomConfigValidator } from "#/validators/roomConfigValidator";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { eq } from "drizzle-orm";

const MAX_ROOM_NAME_LENGTH = 128;
const MAX_ROOM_DESCRIPTION_LENGTH = 512;

export const adminUpdateRoom = defineAction({
  input: z.object({
    roomId: z.string(),
    name: z.string().min(1).max(MAX_ROOM_NAME_LENGTH).optional(),
    description: z
      .string()
      .max(MAX_ROOM_DESCRIPTION_LENGTH)
      .nullable()
      .optional(),
    config: z.string().optional(), // JSON string, validated in handler
  }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user || user.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    const updates: Partial<typeof rooms.$inferInsert> = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.description !== undefined) {
      updates.description = input.description;
    }
    if (input.config !== undefined) {
      const parsed = JSON.parse(input.config);
      const validated = roomConfigValidator.parse(parsed);
      updates.config = validated as unknown;
    }

    await db.update(rooms).set(updates).where(eq(rooms.id, input.roomId));

    const [updated] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, input.roomId))
      .limit(1);

    return { room: updated };
  },
});
