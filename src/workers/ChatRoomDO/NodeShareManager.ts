import { db as d1 } from "#/db";
import type { NodeShareResult, NodeUnshareResult } from "./types";
import { logError } from "./utils";
import { env } from "cloudflare:workers";

type UserDataDOStub = ReturnType<typeof env.USER_DATA_DO.get>;

export class NodeShareManager {
  constructor(
    private ctx: DurableObjectState,
    private roomId: string,
    private roomOwnerUserId: string,
  ) {
    //
  }

  private async getUserDataDO(userId: string): Promise<
    | {
        result: "ok";
        userDataDO: UserDataDOStub;
      }
    | {
        result: "error";
        reason: string;
      }
  > {
    const userDataDOId = (
      await d1.query.users.findFirst({
        where: {
          id: userId,
        },
      })
    )?.user_data_do_id;
    if (!userDataDOId) {
      const reason = `No user data DO found for userId: ${userId}`;
      logError(reason);
      return {
        result: "error",
        reason,
      };
    }

    return {
      result: "ok",
      userDataDO: env.USER_DATA_DO.get(
        env.USER_DATA_DO.idFromString(userDataDOId),
      ),
    };
  }

  async shareUserNodeId({
    userId,
    nodeId,
    displayName,
  }: {
    userId: string;
    nodeId: string;
    displayName: string;
  }): Promise<NodeShareResult> {
    console.log(`Sharing user nodeId: ${nodeId} for userId: ${userId}`);
    const userDataDOResult = await this.getUserDataDO(userId);
    if (userDataDOResult.result === "error") {
      return userDataDOResult;
    }

    const shareResult = await userDataDOResult.userDataDO.shareNodeWithRoom({
      nodeId,
      roomId: this.roomId,
      roomDurableObjectId: this.ctx.id.toString(),
      userDisplayName: displayName,
    });

    console.log(shareResult);

    return shareResult;
  }

  async unshareUserNodeId({
    requestingUserId,
    ownerUserId,
    nodeId,
  }: {
    requestingUserId: string;
    ownerUserId: string;
    nodeId: string;
  }): Promise<NodeUnshareResult> {
    const isAllowed =
      requestingUserId === ownerUserId ||
      requestingUserId === this.roomOwnerUserId;

    if (!isAllowed) {
      return {
        result: "error",
        reason: "You are not allowed to unshare this item",
      };
    }

    const userDataDOResult = await this.getUserDataDO(ownerUserId);
    if (userDataDOResult.result === "error") {
      return userDataDOResult;
    }

    return await userDataDOResult.userDataDO.unshareNodeFromRoom({
      nodeId,
      roomId: this.roomId,
      roomDurableObjectId: this.ctx.id.toString(),
    });
  }
}
