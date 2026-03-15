import type { ROLL_TYPES, ROOM_TYPES } from "#/constants";

export type RoomType = (typeof ROOM_TYPES)[number];

export type RollType = (typeof ROLL_TYPES)[number];
