import { db as d1 } from "#/db";
import type { InvertedDraws } from "#/schemas/invertedDraws";
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
   * List the Cards of a Deck for a draw, plus the Deck's authoritative name.
   *
   * The owner's file store does the real work (authorisation against the room's
   * shares, Deck validation, deriving Cards from the folder's direct image
   * children — see `UserDataDO.getDeckCards`). This just resolves the owner's DO
   * and maps its result into the shape the `cards` capability wants, with a
   * user-facing reason on the failure paths.
   */
  async listDeckCards({
    ownerUserId,
    deckNodeId,
  }: {
    ownerUserId: string;
    deckNodeId: string;
  }): Promise<
    | {
        result: "ok";
        deckName: string;
        allowFaceDown: boolean;
        invertedDraws: InvertedDraws;
        cards: {
          nodeId: string;
          name: string;
          back: { nodeId: string; name: string } | null;
        }[];
      }
    | { result: "error"; reason: string }
  > {
    const userDataDOResult = await this.getUserDataDO(ownerUserId);
    if (userDataDOResult.result === "error") {
      return userDataDOResult;
    }

    const deckResult = await userDataDOResult.userDataDO.getDeckCards({
      nodeId: deckNodeId,
      roomId: this.roomId,
    });

    if (deckResult.result === "no-access") {
      return {
        result: "error",
        reason: "You do not have access to this deck",
      };
    }
    if (deckResult.result === "not-a-deck") {
      return { result: "error", reason: "That folder is not a deck" };
    }

    return {
      result: "ok",
      deckName: deckResult.deckName,
      allowFaceDown: deckResult.allowFaceDown,
      invertedDraws: deckResult.invertedDraws,
      cards: deckResult.cards,
    };
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

  /**
   * Remove a share from the room, driven from the shared-items list. Allowed
   * for the room owner (clearing anything, including a stale record) or the
   * share's own owner (clearing their own without drilling into it).
   *
   * The room's own record is dropped by the caller regardless; here we only
   * authorise and then *attempt* to tell the owner's store to revoke its grant.
   * That notification is best-effort and non-fatal: a share whose owner or node
   * is already gone is exactly what this path exists to clear, so an
   * unreachable owner DO is logged, not surfaced, and never blocks removal.
   */
  async removeShareFromRoom({
    requestingUserId,
    ownerUserId,
    nodeId,
  }: {
    requestingUserId: string;
    ownerUserId: string;
    nodeId: string;
  }): Promise<{ result: "ok" } | { result: "error"; reason: string }> {
    const isAllowed =
      requestingUserId === ownerUserId ||
      requestingUserId === (await this.getUserId());

    if (!isAllowed) {
      return {
        result: "error",
        reason: "You are not allowed to remove this shared item",
      };
    }

    const userDataDOResult = await this.getUserDataDO(ownerUserId);
    if (userDataDOResult.result === "ok") {
      try {
        await userDataDOResult.userDataDO.unshareNodeFromRoom({
          nodeId,
          roomId: this.roomId,
          roomDurableObjectId: this.ctx.id.toString(),
        });
      } catch (cause) {
        logError(
          `Best-effort unshare notification to owner ${ownerUserId} failed ` +
            `for node ${nodeId}`,
          cause,
        );
      }
    }

    return { result: "ok" };
  }
}
