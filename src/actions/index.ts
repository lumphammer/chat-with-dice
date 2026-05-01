import { adminSetRoomDeleted } from "./adminSetRoomDeleted";
import { adminUpdateRoom } from "./adminUpdateRoom";
import { createChatWithDiceRoom } from "./createChatWithDiceRoom";
import { createFolder } from "./createFolder";
import { deleteRoom } from "./deleteRoom";
import { getMyRooms } from "./getMyRooms";

export const server = {
  createChatWithDiceRoom,
  deleteRoom,
  getMyRooms,
  createFolder,
  admin: {
    updateRoom: adminUpdateRoom,
    setRoomDeleted: adminSetRoomDeleted,
  },
};
