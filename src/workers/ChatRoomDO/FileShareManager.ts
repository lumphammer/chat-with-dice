import { db as d1 } from "#/db";
import { logError } from "./utils";
import { env } from "cloudflare:workers";

export class FileShareManager {
  constructor(
    private ctx: DurableObjectState,
    private roomId: string,
  ) {
    //
  }
  async shareUserNodeId({
    userId,
    nodeId,
  }: {
    userId: string;
    nodeId: string;
  }) {
    console.log(`Sharing user nodeId: ${nodeId} for userId: ${userId}`);
    const userDataDOId = (
      await d1.query.users.findFirst({
        where: {
          id: userId,
        },
      })
    )?.user_data_do_id;
    if (!userDataDOId) {
      logError(`No user data DO found for userId: ${userId}`);
      return;
    }
    const shareResult = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(userDataDOId),
    ).shareNodeWithRoom({
      nodeId,
      roomId: this.roomId,
      chatRoomDurableObjectId: this.ctx.id.toString(),
    });
    console.log(shareResult);
    return shareResult;
  }
}
