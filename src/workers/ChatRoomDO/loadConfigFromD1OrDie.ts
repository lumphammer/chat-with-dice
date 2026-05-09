import { db as d1 } from "#/db";
import { rooms } from "#/schemas/coreD1-schema";
import {
  roomConfigValidator,
  type RoomConfig,
} from "#/validators/roomConfigValidator";
import { defaultRoomConfig } from "./defaultRoomConfig";
import { eq } from "drizzle-orm";

export async function loadConfigFromD1OrDie(
  ctx: DurableObjectState,
): Promise<{ config: RoomConfig; createdByUserId: string }> {
  let config: RoomConfig | null = null;
  let createdByUserId: string | null = null;

  const roomRows = await d1
    .select({
      config: rooms.config,
      createByUserId: rooms.createdByUserId,
    })
    .from(rooms)
    .where(eq(rooms.durableObjectId, ctx.id.toString()))
    .limit(1);
  const roomRow = roomRows[0];
  if (!roomRow) {
    throw new Error(`Room data not found for DO id: ${ctx.id}`);
  }
  const parsedConfig = roomConfigValidator.safeParse(roomRow.config);
  if (parsedConfig.success) {
    config = parsedConfig.data;
  } else {
    console.error(
      "Room Config failed validation, falling back to defaults",
      parsedConfig.error,
    );
    config = defaultRoomConfig;
  }
  createdByUserId = roomRow.createByUserId;

  return { config, createdByUserId };
}
