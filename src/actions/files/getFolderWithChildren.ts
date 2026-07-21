import { db as d1 } from "#/db";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

export const getFolderWithChildren = defineAction({
  input: z.object({
    folderId: z.string().nullable().optional(),
    ownerUserId: z.string().optional(),
    roomId: z.string().optional(),
    includeDeleted: z.boolean().optional(),
  }),
  handler: async (
    { folderId, ownerUserId, roomId, includeDeleted = false },
    context,
  ) => {
    const loggedInUser = context.locals.user;
    if (!loggedInUser) {
      throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const isSelf =
      (!loggedInUser.isAnonymous && ownerUserId === undefined) ||
      ownerUserId === loggedInUser.id;

    if (isSelf) {
      if (!loggedInUser.userDataDOId) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "user_data_do_id is not set",
        });
      }
      const userDataDO = env.USER_DATA_DO.get(
        env.USER_DATA_DO.idFromString(loggedInUser.userDataDOId),
      );
      return await userDataDO.getFolderWithChildren(folderId, includeDeleted);
    }

    // cross-user read — must specify a room and a concrete folder; we never
    // expose "root" of someone else's drive
    if (!roomId) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "roomId is required for cross-user reads",
      });
    }
    if (!folderId) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "folderId is required for cross-user reads",
      });
    }
    const owner = await d1.query.users.findFirst({
      where: { id: ownerUserId },
    });
    if (!owner?.user_data_do_id) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Owner's user_data_do_id is not set",
      });
    }

    const ownerDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(owner.user_data_do_id),
    );

    const accessible = await ownerDO.isNodeAccessibleFromRoom({
      nodeId: folderId,
      roomId,
    });
    if (!accessible) {
      throw new ActionError({ code: "FORBIDDEN", message: "Forbidden" });
    }

    // cross-user requests never show deleted nodes
    return await ownerDO.getFolderWithChildren(folderId, false);
  },
});
