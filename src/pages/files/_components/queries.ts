import { db } from "#/db";

export const getUserNodes = async (userId: string, folderId?: string) => {
  const nodes = await db.query.nodes.findMany({
    where: {
      ownerUserId: userId,
      deletedTime: {
        isNull: true,
      },
      parentFolderId: folderId ?? {
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
