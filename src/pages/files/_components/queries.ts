import { db } from "#/db";

export const getUserNodes = async (userId: string, folderId?: string) => {
  const nodes = await db.query.nodes.findMany({
    where: {
      owner_user_id: userId,
      deleted_time: {
        isNull: true,
      },
      parent_folder_id: folderId ?? {
        isNull: true,
      },
    },
    with: {
      file: true,
      folder: true,
    },
  });

  return nodes;
};
