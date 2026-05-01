import { adminSetRoomDeleted } from "./adminSetRoomDeleted";
import { adminUpdateRoom } from "./adminUpdateRoom";
import { createChatWithDiceRoom } from "./createChatWithDiceRoom";
import { createFolder } from "./createFolder";
import { deleteNode } from "./deleteNode";
import { deleteRoom } from "./deleteRoom";
import { getMyRooms } from "./getMyRooms";
import { getNodes } from "./getNodes";
import { renameNode } from "./renameNode";

export const server = {
  createChatWithDiceRoom,
  deleteRoom,
  getMyRooms,
  createFolder,
  deleteNode,
  getNodes,
  renameNode,
  admin: {
    updateRoom: adminUpdateRoom,
    setRoomDeleted: adminSetRoomDeleted,
  },
};
