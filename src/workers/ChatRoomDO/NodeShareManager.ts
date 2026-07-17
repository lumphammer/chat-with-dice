import { db as d1 } from "#/db";
import { logger } from "#/utils/logger.ts";
import type { NodeShareResult, NodeUnshareResult } from "./types";
import { logError } from "./utils";
import { env } from "cloudflare:workers";

type UserDataDOStub = ReturnType<typeof env.USER_DATA_DO.get>;

export class NodeShareManager {
  constructor(
    private ctx: DurableObjectState,
    private roomId: string,
    private getUserId: () => Promise<string | undefined>,
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
    logger.log(`Sharing user nodeId: ${nodeId} for userId: ${userId}`);
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

    return shareResult;
  }

  /**
   * List the Cards of a Deck for a draw. A Card is a direct image child of the
   * Deck folder; images nested in subfolders are source art, not Cards.
   *
   * Access is authorised against the owner's DO via `isNodeAccessibleFromRoom`
   * — the room-side share cache is never trusted for this (see ADR-0001). Cards
   * are read live from the owner's file store on every draw, never stored or
   * snapshotted, so an image added to the Deck is drawable at once and a
   * deleted one simply stops being drawn.
   */
  async listDeckCards({
    ownerUserId,
    deckNodeId,
  }: {
    ownerUserId: string;
    deckNodeId: string;
  }): Promise<
    | { result: "ok"; cards: { nodeId: string; name: string }[] }
    | { result: "error"; reason: string }
  > {
    const userDataDOResult = await this.getUserDataDO(ownerUserId);
    if (userDataDOResult.result === "error") {
      return userDataDOResult;
    }

    const accessible =
      await userDataDOResult.userDataDO.isNodeAccessibleFromRoom({
        nodeId: deckNodeId,
        roomId: this.roomId,
      });
    if (!accessible) {
      return {
        result: "error",
        reason: "You do not have access to this deck",
      };
    }

    const children = await userDataDOResult.userDataDO.getNodes(
      deckNodeId,
      false,
    );
    const cards = children
      .filter(
        (node) => node.kind === "file" && node.contentType.startsWith("image/"),
      )
      .map((node) => ({ nodeId: node.id, name: node.name }));

    return { result: "ok", cards };
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
      requestingUserId === (await this.getUserId());

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
