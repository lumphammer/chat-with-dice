import * as dbSchema from "#/schemas/UserDataDO-schema";

/**
 * reflects the value you get when querying the folders table with its deck
 * relation included.
 */
export type DbFolder = typeof dbSchema.folders.$inferSelect & {
  deck: typeof dbSchema.decks.$inferSelect | null;
};

/**
 * reflects the value you get when querying the nodes table with file & folder
 * relations included. Only for use inside UserDataDO & friends.
 */
export type DbNode = typeof dbSchema.nodes.$inferSelect & {
  file: typeof dbSchema.files.$inferSelect | null;
  folder: DbFolder | null;
};

/**
 * reflects the value you get when querying the room_resource_shares table with
 * node relations included. Only for use inside UserDataDO & friends.
 */
export type DbShare = typeof dbSchema.roomResourceShares.$inferSelect & {
  node: DbNode;
};
