import * as dbSchema from "#/schemas/UserDataDO-schema";

/**
 * reflects the value you get when querying the nodes table with file & folder
 * relations included. Only for use inside UserDataDO & friends.
 */
export type DbNode = typeof dbSchema.nodes.$inferSelect & {
  file: typeof dbSchema.files.$inferSelect | null;
  folder: typeof dbSchema.folders.$inferSelect | null;
};

/**
 * reflects the value you get when querying the room_resource_shares table with
 * node relations included. Only for use inside UserDataDO & friends.
 */
export type DbShare = typeof dbSchema.roomResourceShares.$inferSelect & {
  node: DbNode;
};
