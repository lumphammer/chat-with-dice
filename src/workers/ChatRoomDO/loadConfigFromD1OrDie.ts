import { db as d1 } from "#/db";
import {
  roomConfigValidator,
  type RoomConfig,
} from "#/validators/roomConfigValidator";
import { defaultRoomConfig } from "./defaultRoomConfig";
import { logError } from "./utils";

export async function loadConfigFromD1OrDie(
  ctx: DurableObjectState,
): Promise<{ config: RoomConfig; createdByUserId: string; roomId: string }> {
  let config: RoomConfig | null = null;
  let createdByUserId: string | null = null;
  let roomId: string | null = null;

  const roomRow = await d1.query.rooms.findFirst({
    where: {
      durableObjectId: ctx.id.toString(),
      deleted_time: {
        isNull: true,
      },
    },
  });
  if (!roomRow) {
    throw new Error(`Room data not found for DO id: ${ctx.id.toString()}`);
  }
  const parsedConfig = roomConfigValidator.safeParse(roomRow.config);
  if (parsedConfig.success) {
    config = parsedConfig.data;
  } else {
    logError(
      "Room Config failed validation, falling back to defaults",
      parsedConfig.error,
    );
    config = defaultRoomConfig;
  }
  createdByUserId = roomRow.createdByUserId;
  roomId = roomRow.id;

  return { config, createdByUserId, roomId };
}
