import { adminSetRoomDeleted } from "./adminSetRoomDeleted";
import { adminUpdateRoom } from "./adminUpdateRoom";
import { createChatWithDiceRoom } from "./createChatWithDiceRoom";
import { deleteRoom } from "./deleteRoom";
import { getMyRooms } from "./getMyRooms";

export const server = {
  createChatWithDiceRoom,
  deleteRoom,
  getMyRooms,
  admin: {
    updateRoom: adminUpdateRoom,
    setRoomDeleted: adminSetRoomDeleted,
  },
};
