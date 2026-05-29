import { adminCleanupMissingStorageObjects } from "./admin/adminCleanupMissingStorageObjects";
import { adminDeleteStorageOrphans } from "./admin/adminDeleteStorageOrphans";
import { adminRecalculateStorageFolderSizes } from "./admin/adminRecalculateStorageFolderSizes";
import { adminSetRoomDeleted } from "./admin/adminSetRoomDeleted";
import { adminStorageReport } from "./admin/adminStorageReport";
import { adminUpdateRoom } from "./admin/adminUpdateRoom";
import { adminUpdateUserQuota } from "./admin/adminUpdateUserQuota";
import { createFolder } from "./files/createFolder";
import { deleteNode } from "./files/deleteNode";
import { getNodes } from "./files/getNodes";
import { hardDeleteNode } from "./files/hardDeleteNode";
import { renameNode } from "./files/renameNode";
import { restoreNode } from "./files/restoreNode";
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
    hardDeleteNode,
    restoreNode,
  },
  admin: {
    updateRoom: adminUpdateRoom,
    setRoomDeleted: adminSetRoomDeleted,
    updateUserQuota: adminUpdateUserQuota,
    storageReport: adminStorageReport,
    recalculateStorageFolderSizes: adminRecalculateStorageFolderSizes,
    deleteStorageOrphans: adminDeleteStorageOrphans,
    cleanupMissingStorageObjects: adminCleanupMissingStorageObjects,
  },
};
