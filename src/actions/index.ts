import { adminSetRoomDeleted } from "./admin/adminSetRoomDeleted";
import { adminStorageReport } from "./admin/adminStorageReport";
import { adminUpdateRoom } from "./admin/adminUpdateRoom";
import { adminUpdateUserQuota } from "./admin/adminUpdateUserQuota";
import { createFolder } from "./files/createFolder";
import { deleteNode } from "./files/deleteNode";
import { getNodes } from "./files/getNodes";
import { renameNode } from "./files/renameNode";
import { createChatWithDiceRoom } from "./rooms/createChatWithDiceRoom";
import { deleteRoom } from "./rooms/deleteRoom";
import { getMyRooms } from "./rooms/getMyRooms";

export const server = {
  rooms: {
    createChatWithDiceRoom,
    deleteRoom,
    getMyRooms,
  },
  files: {
    createFolder,
    deleteNode,
    getNodes,
    renameNode,
  },
  admin: {
    updateRoom: adminUpdateRoom,
    setRoomDeleted: adminSetRoomDeleted,
    updateUserQuota: adminUpdateUserQuota,
    storageReport: adminStorageReport,
  },
};
