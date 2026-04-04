import type { RoomConfig } from "#/validators/roomConfigValidator";

export const defaultRoomConfig: RoomConfig = {
  version: 1,
  capabilities: [
    {
      name: "counter",
      config: {
        startAt: 100,
      },
    },
  ],
};
