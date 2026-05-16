import { db as d1 } from "#/db";
import * as dbSchema from "#/schemas/ChatRoomDO-schema";
import type { NodeShareResult } from "./types";
import { logError } from "./utils";
import { env } from "cloudflare:workers";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

export class NodeShareManager {
  constructor(
    private ctx: DurableObjectState,
    private roomId: string,
    private db: DrizzleSqliteDODatabase<typeof dbSchema>,
  ) {
    //
  }
  async shareUserNodeId({
    userId,
    nodeId,
  }: {
    userId: string;
    nodeId: string;
  }): Promise<NodeShareResult> {
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
      return {
        result: "error",
        reason: `No user data DO found for userId: ${userId}`,
      };
    }
    const shareResult = await env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(userDataDOId),
    ).shareNodeWithRoom({
      nodeId,
      roomId: this.roomId,
      roomDurableObjectId: this.ctx.id.toString(),
    });

    if (shareResult.result === "created") {
      this.db.insert(dbSchema.SharedNodes).values({
        kind: shareResult.kind,
        r2Key: shareResult.kind === "file" ? shareResult.r2Key : null,
        userId,
        nodeId,
      });
    }

    console.log(shareResult);

    return shareResult;
  }
}
