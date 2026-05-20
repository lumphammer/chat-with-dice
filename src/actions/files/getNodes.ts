import { db as d1 } from "#/db";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const getNodes = defineAction({
  input: z.object({
    folderId: z.string().nullable().optional(),
    ownerUserId: z.string().optional(),
    roomId: z.string().optional(),
  }),
  handler: async ({ folderId, ownerUserId, roomId }, context) => {
    const user = context.locals.user;
    if (!user) {
      throw new Error("Unauthorized");
    }

    const isSelf =
      (!user.isAnonymous && ownerUserId === undefined) ||
      ownerUserId === user.id;

    if (isSelf) {
      const userDataDO = env.USER_DATA_DO.getByName(user.id);
      return await userDataDO.getNodes(folderId);
    }

    // cross-user read — must specify a room and a concrete folder; we never
    // expose "root" of someone else's drive
    if (!roomId) {
      throw new Error("roomId is required for cross-user reads");
    }
    if (!folderId) {
      throw new Error("folderId is required for cross-user reads");
    }
    const owner = await d1.query.users.findFirst({
      where: { id: ownerUserId },
    });
    if (!owner?.user_data_do_id) {
      throw new Error("Owner not found");
    }

    const ownerDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(owner.user_data_do_id),
    );

    const accessible = await ownerDO.isNodeAccessibleFromRoom({
      nodeId: folderId,
      roomId,
    });
    if (!accessible) {
      throw new Error("Forbidden");
    }

    return await ownerDO.getNodes(folderId);
  },
});
