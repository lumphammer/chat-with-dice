import { db as d1 } from "#/db";
import { rooms, users } from "#/schemas/coreD1-schema";
import { fixStringTimestampThatShouldBeEpochMs } from "#/utils/fixStringTimestampThatShouldBeEpochMs.ts";
import { error, success, type PromiseMaybeError } from "#/utils/maybeError";
import { processInBatches } from "#/utils/processInBatches";
import {
  userFileR2Key,
  userFilesPrefix,
  userFileThumbnailsPrefix,
} from "#/utils/r2Keys";
import {
  R2_REPAIR_BATCH_SIZE,
  R2_REPAIR_SUBREQUEST_BUDGET,
} from "#/utils/r2RepairLimits";
import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import type { NodeShareResult, NodeUnshareResult } from "../ChatRoomDO/types";
import type { DbNode, DbShare } from "./DbNodeType";
import { Scheduler } from "./Scheduler";
import { UserDataRepository } from "./UserDataRepository";
import { notifyRoomsOfShareRemoval } from "./notifyRoomsOfShareRemoval";
import type {
  FolderSizeReport,
  FolderSizeRepairResult,
  MissingBlobCleanupInput,
  MissingBlobCleanupResult,
  PathResolution,
  R2ReconciliationReport,
} from "./types";
import {
  dbNodeToStorageNode,
  isUniqueConstraintError,
  listAllR2Objects,
  log,
  logError,
} from "./utils";
import { DurableObject } from "cloudflare:workers";
import { env as cfEnv } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export class UserDataDO extends DurableObject {
  private repo!: UserDataRepository;
  private userId!: string | undefined;
  private scheduler!: Scheduler;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    log(
      "\n\n=====================================\nUserDataDO id booting:",
      ctx.id.toString(),
    );

    void this.ctx.blockConcurrencyWhile(async () => {
      this.userId = await this.resolveUserId();
      this.repo = new UserDataRepository(ctx);
      // The purge reaps nodes inside this DO, so it is the only thing that can
      // tell rooms their shares are gone. Reads `this.userId` at call time, so
      // constructing the Scheduler before the id resolves would still be fine.
      this.scheduler = new Scheduler(this.ctx, this.repo, async (rows) => {
        if (this.userId) {
          await notifyRoomsOfShareRemoval(this.userId, rows);
        }
      });
    });
  }

  async alarm() {
    await this.scheduler.alarm();
  }

  /**
   * Get the cached userId (it should never change), or if it's not in KV, look
   * up our DO id in D1 to find the user and cache it.
   */
  private async resolveUserId(): Promise<string | undefined> {
    const cached = this.ctx.storage.kv.get("userId");
    if (typeof cached === "string") {
      return cached;
    }
    const user = await d1.query.users.findFirst({
      where: {
        user_data_do_id: this.ctx.id.toString(),
      },
    });
    if (!user) {
      return undefined;
    }
    this.ctx.storage.kv.put("userId", user.id);
    return user.id;
  }

  /**
   * Resolve a URL path like `["campaigns", "maps"]` to a folder ID.
   *
   * If the full path resolves to folders, returns `{ kind: "folder" }`.
   * If all-but-last resolve to folders and the last segment is a file in that
   * folder, returns `{ kind: "file" }`.
   * Otherwise returns `{ kind: "not-found" }`.
   */
  async resolvePathToFolder(pathSegments: string[]): Promise<PathResolution> {
    // empty path = root folder
    if (pathSegments.length === 0) {
      return { kind: "folder", folderId: null, breadcrumbs: [] };
    }

    const rows = this.repo.walkPathSegments(pathSegments);

    const breadcrumbs = rows.map((row, i) => ({
      id: row.folder_id,
      name: pathSegments[i],
    }));

    // all segments resolved as folders
    if (rows.length === pathSegments.length) {
      return {
        kind: "folder",
        folderId: rows[rows.length - 1].folder_id,
        breadcrumbs,
      };
    }

    // all-but-last resolved — check if the last segment is a file
    if (rows.length === pathSegments.length - 1) {
      const parentFolderId =
        rows.length > 0 ? rows[rows.length - 1].folder_id : null;
      const fileName = pathSegments[pathSegments.length - 1];

      const fileNode = await this.repo.findFileNodeByNameInFolder(
        parentFolderId,
        fileName,
      );

      if (fileNode) {
        return {
          kind: "file",
          folderId: parentFolderId,
          fileNodeId: fileNode.id,
          breadcrumbs,
        };
      }
    }

    return { kind: "not-found" };
  }

  /**
   * Get the contents of a folder. By design, this only works for live folders;
   * We do not allow navigation of soft-deleted folders.
   */
  async getNodes(
    folderId: string | null | undefined,
    includeDeleted: boolean,
  ): Promise<StorageNode[]> {
    if (folderId) {
      const folderNode = await this.repo.getNode(folderId);
      if (!folderNode) {
        throw new Error("Folder not found");
      }
    }
    const dbNodes = await this.repo.getChildNodes(folderId, includeDeleted);
    const storageNodes = dbNodes.map<StorageNode>((dbNode) => {
      return dbNodeToStorageNode(dbNode);
    });
    return storageNodes;
  }

  async createFolder(name: string, parentFolderId?: string | null) {
    const id = nanoid();
    try {
      await this.repo.createFolder(id, name, parentFolderId);
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        throw new Error("A folder with that name already exists here", {
          cause: e,
        });
      }
      throw e;
    }
    return { id, name };
  }

  /**
   * Tell every room holding a share at or below `nodeId` whether that share is
   * still viewable. Call *after* the change lands, since availability is read
   * back out of the database rather than inferred from the operation.
   *
   * Best-effort and non-fatal: a room that cannot be reached keeps a stale
   * entry in its sidebar, which 403s on click exactly as it did before this
   * existed. Failing the user's delete over it would be a worse trade.
   */
  private async notifyRoomsOfShareAvailability(nodeId: string): Promise<void> {
    if (!this.userId) {
      return;
    }
    const ownerUserId = this.userId;

    const rows = this.repo.findSharesAtOrBelow(nodeId);
    if (rows.length === 0) {
      return;
    }

    // One RPC per room, not per share: a room holding several shares under the
    // binned folder should hear once.
    const byRoom = new Map<
      string,
      { nodeId: string; unavailable: boolean }[]
    >();
    for (const row of rows) {
      const changes = byRoom.get(row.room_durable_object_id) ?? [];
      changes.push({
        nodeId: row.node_id,
        unavailable: row.unavailable === 1,
      });
      byRoom.set(row.room_durable_object_id, changes);
    }

    await Promise.all(
      [...byRoom].map(async ([roomDurableObjectId, changes]) => {
        try {
          const room = cfEnv.CHAT_ROOM_DO.get(
            cfEnv.CHAT_ROOM_DO.idFromString(roomDurableObjectId),
          );
          await room.onShareAvailabilityChange(
            changes.map((change) => ({ ...change, ownerUserId })),
          );
        } catch (cause) {
          logError(
            `Failed to notify room ${roomDurableObjectId} of share availability`,
            cause,
          );
        }
      }),
    );
  }

  async softDeleteNode(nodeId: string) {
    const node = await this.repo.getNode(nodeId);
    if (!node) {
      throw new Error("File or folder not found");
    }

    await this.repo.softDeleteNode(nodeId);
    await this.notifyRoomsOfShareAvailability(nodeId);

    const sizeToSubtract = node.file
      ? node.file.sizeBytes
      : (node.folder?.recursiveSizeBytes ?? 0);

    if (node.parentFolderId && sizeToSubtract > 0) {
      this.repo.adjustAncestorSizes(node.parentFolderId, -sizeToSubtract);
    }
    await this.syncQuotaWithSizes();
    await this.scheduler.schedulePurge();
  }

  async restoreNode(nodeId: string): PromiseMaybeError {
    log("restoring", nodeId);
    const node = await this.repo.getNode(nodeId, { include: "deleted" });
    if (!node) {
      return error("Node not found or not soft deleted", "NOT_FOUND");
    }
    const usage = await d1.query.users.findFirst({
      where: {
        user_data_do_id: this.ctx.id.toString(),
      },
      columns: {
        storage_quota_bytes: true,
        storage_used_bytes: true,
      },
    });
    if (!usage) {
      return error("User not found", "BAD_REQUEST");
    }

    const sizeBytes =
      node.file?.sizeBytes ?? node.folder?.recursiveSizeBytes ?? 0;

    if (usage.storage_used_bytes + sizeBytes > usage.storage_quota_bytes) {
      return error("Storage quota exceeded", "BAD_REQUEST");
    }

    // check shadowedness
    const isShadowed = this.repo.isNodeShadowedByADeletedFolder(nodeId);
    if (isShadowed) {
      return error("Node is shadowed by a deleted folder", "BAD_REQUEST");
    }

    try {
      await this.repo.restoreNode(nodeId);
    } catch (cause) {
      logError(cause);
      if (isUniqueConstraintError(cause)) {
        return error(
          "A file with that name already exists in this folder",
          "BAD_REQUEST",
        );
      }
      return error(
        `Failed to restore file: ${cause instanceof Error ? cause.message : JSON.stringify(cause)}`,
        "INTERNAL_SERVER_ERROR",
        cause,
      );
    }

    if (node.parentFolderId) {
      this.repo.adjustAncestorSizes(node.parentFolderId, sizeBytes);
    }

    await this.syncQuotaWithSizes();
    await this.notifyRoomsOfShareAvailability(nodeId);
    return success();
  }

  /**
   * hard-delete nodes regardless of current soft-deletion status
   */
  async dangerouslyHardDeleteNodes(nodeIds: string[]) {
    const r2Keys = this.repo.recursivelyGetDescendantR2Keys(nodeIds);
    // Gather affected shares before the delete: `roomResourceShares.nodeId`
    // cascades, so once the nodes are gone the rows we need to route on are too.
    const shareRows = this.repo.findSharesAtOrBelowNodes(nodeIds);
    await this.repo.hardDeleteNodes(nodeIds);
    try {
      // this isn't batched, but this path is only used by user-initiated actions
      // and upload cleanup, so there will never be more than a few.
      // we're doing the db operation and the r2 operation sequentially to avoid
      // the possibility of nuking r2 blobs while the db operation fails and
      // leaves records in the db.
      await cfEnv.PRIVATE_R2?.delete(r2Keys);
    } finally {
      // The share rows have already cascaded away, so a retry can't rebuild this
      // payload — notify even if the R2 delete threw, then let that error
      // propagate. Best-effort per room, so this never throws on its own.
      if (this.userId) {
        await notifyRoomsOfShareRemoval(this.userId, shareRows);
      }
    }
  }

  /**
   * hard delete nodes that have been soft-deleted
   */
  async hardDeleteNodes(nodeIds: string[]) {
    const nodes = await this.repo.getNodes(nodeIds, {
      include: "deleted",
    });
    const requestedNodeIdsSet = new Set(nodeIds);
    const foundNodeIdsSet = new Set(nodes.map((n) => n.id));
    const missingNodeIds = requestedNodeIdsSet.difference(foundNodeIdsSet);
    if (missingNodeIds.size > 0) {
      return error(
        `Nodes not found: ${Array.from(missingNodeIds).join(", ")}`,
        "NOT_FOUND",
      );
    }

    // pull the trigger
    await this.dangerouslyHardDeleteNodes(nodeIds);
    return success();
  }

  async createFile(
    filename: string,
    contentType: string,
    folderId: string | null | undefined,
  ): PromiseMaybeError<{ id: string; r2Key: string }> {
    if (!this.userId) {
      return error("User not found", "NOT_FOUND");
    }
    const id = crypto.randomUUID();
    const r2Key = userFileR2Key(this.userId, id);
    log(`createFile: ${filename}, ${r2Key}`);
    try {
      await this.repo.createFile({
        id,
        name: filename,
        r2Key,
        contentType,
        parentFolderId: folderId,
      });
    } catch (cause) {
      logError(cause);
      if (isUniqueConstraintError(cause)) {
        return error(
          "A file with that name already exists in this folder",
          "BAD_REQUEST",
        );
      }
      return error(
        `Failed to create file: ${cause instanceof Error ? cause.message : JSON.stringify(cause)}`,
        "INTERNAL_SERVER_ERROR",
        cause,
      );
    }
    return success({ id, r2Key });
  }

  async markFileReady(id: string, sizeBytes: number, folderId?: string | null) {
    const usage = await d1.query.users.findFirst({
      where: {
        user_data_do_id: this.ctx.id.toString(),
      },
      columns: {
        storage_quota_bytes: true,
        storage_used_bytes: true,
      },
    });

    if (!usage) {
      throw new Error("User not found");
    }

    if (usage.storage_used_bytes + sizeBytes > usage.storage_quota_bytes) {
      const r2Key = (await this.repo.getNode(id))?.file?.r2Key;
      await this.repo.hardDeleteNodes([id]);
      if (r2Key) {
        await cfEnv.PRIVATE_R2?.delete(r2Key);
      }
      throw new Error("Storage quota exceeded");
    }

    await this.repo.markFileReady(id, sizeBytes);
    if (folderId) {
      this.repo.adjustAncestorSizes(folderId, sizeBytes);
    }
    await this.syncQuotaWithSizes();
  }

  async markFileThumbnailReady(
    id: string,
    thumbnailR2Key: string,
    thumbnailContentType: string,
    thumbnailSizeBytes: number,
  ) {
    const result = await this.repo.setFileThumbnail(id, {
      thumbnailR2Key,
      thumbnailContentType,
      thumbnailSizeBytes,
    });
    if (result.rowsWritten === 0) {
      throw new Error("File not found");
    }
  }

  async renameNode(id: string, newName: string) {
    try {
      const result = await this.repo.setNodeName(id, newName);
      if (result.rowsWritten === 0) {
        throw new Error("File or folder not found");
      }
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        throw new Error(
          "An item with that name already exists in this folder",
          { cause: e },
        );
      }
      throw e;
    }
  }

  async setFolderIsDeck(nodeId: string, isDeck: boolean) {
    const node = await this.repo.getNode(nodeId);
    if (!node) {
      throw new Error("File or folder not found");
    }
    if (!node.folder) {
      throw new Error("Only folders can be Decks");
    }
    if (isDeck) {
      await this.repo.markFolderAsDeck(nodeId);
    } else {
      await this.repo.unmarkFolderAsDeck(nodeId);
    }
  }

  /**
   * Resolve a node as a Deck for a configuration change, or `null` if it is not
   * a folder marked as a Deck. Owner-scoped: these methods run against the
   * owner's own DO, so authorisation is ownership of the DO itself.
   *
   * Returns `null` for the expected "not a Deck" case rather than throwing, so
   * callers can map it to a client error while a genuine store failure (a throw
   * from `getNode`) still propagates and surfaces as a server error.
   */
  private async getDeckNode(nodeId: string): Promise<DbNode | null> {
    const node = await this.repo.getNode(nodeId);
    if (!node || !node.folder || node.folder.deck === null) {
      return null;
    }
    return node;
  }

  /**
   * The Deck's live image children, its resolved Common Back, and its resolved
   * Individual Back pairings. A Card Image is a direct, ready image child
   * (ADR-0001 decision 3); the Common Back is whichever of those the Deck points
   * at, or `null` if it points at nothing — or at an image that has since been
   * deleted, since the stored id is not a foreign key and is deliberately allowed
   * to go inert.
   *
   * Individual Backs are resolved the same way: a stored pairing counts only
   * when *both* its front and its back are still live image children of the Deck.
   * A pairing referencing a deleted image (front or back) resolves to nothing,
   * so it neither attaches a back nor removes an image from the Cards — it is
   * inert, exactly like a stale Common Back id.
   *
   * `individualBackByFront` maps a front's node id to the image serving as its
   * Individual Back. `individualBackImageIds` is every image currently serving as
   * an Individual Back — those "stop being a Card in their own right".
   */
  private async deriveDeckImages(node: DbNode): Promise<{
    images: { nodeId: string; name: string }[];
    commonBack: { nodeId: string; name: string } | null;
    individualBackByFront: Map<string, { nodeId: string; name: string }>;
    individualBackImageIds: Set<string>;
  }> {
    const children = await this.repo.getChildNodes(node.id, false);
    const images = children
      .filter(
        (child) =>
          child.file?.contentType.startsWith("image/") &&
          child.file.isReady === 1,
      )
      .map((child) => ({ nodeId: child.id, name: child.name }));
    const imageById = new Map(images.map((image) => [image.nodeId, image]));

    const commonBackId = node.folder?.deck?.commonBackId ?? null;
    const commonBack =
      commonBackId === null ? null : (imageById.get(commonBackId) ?? null);

    const pairings = await this.repo.getDeckIndividualBacks(node.id);
    const individualBackByFront = new Map<
      string,
      { nodeId: string; name: string }
    >();
    const individualBackImageIds = new Set<string>();
    for (const pairing of pairings) {
      const front = imageById.get(pairing.frontId);
      const back = imageById.get(pairing.backId);
      // Both ends must be live for the pairing to take effect; a pairing to a
      // deleted image just goes inert (see the doc comment above).
      if (front && back) {
        individualBackByFront.set(front.nodeId, back);
        individualBackImageIds.add(back.nodeId);
      }
    }

    return {
      images,
      commonBack,
      individualBackByFront,
      individualBackImageIds,
    };
  }

  /**
   * The Deck's Cards paired with their resolved backs, shared by the draw path
   * and the owner's settings editor so both agree on what a Card is.
   *
   * A Card is a live image child that is neither the Common Back nor serving as
   * an Individual Back (both "stop being a Card in their own right"). Each Card's
   * back resolves as its Individual Back if it has one, else the Deck's Common
   * Back if there is one, else `null` (CONTEXT.md).
   */
  private deriveDeckCards(derived: {
    images: { nodeId: string; name: string }[];
    commonBack: { nodeId: string; name: string } | null;
    individualBackByFront: Map<string, { nodeId: string; name: string }>;
    individualBackImageIds: Set<string>;
  }): {
    nodeId: string;
    name: string;
    back: { nodeId: string; name: string } | null;
  }[] {
    const {
      images,
      commonBack,
      individualBackByFront,
      individualBackImageIds,
    } = derived;
    return images
      .filter(
        (image) =>
          image.nodeId !== commonBack?.nodeId &&
          !individualBackImageIds.has(image.nodeId),
      )
      .map((image) => ({
        nodeId: image.nodeId,
        name: image.name,
        back: individualBackByFront.get(image.nodeId) ?? commonBack ?? null,
      }));
  }

  /**
   * Set (or clear, with `null`) a Deck's Common Back. Rejects a `backNodeId`
   * that is not a live, ready image directly inside the Deck, so the back can
   * only ever be one of the Deck's own Card Images.
   *
   * Both rejections are returned as typed results, not thrown, so the caller
   * can turn them into client errors while unexpected store failures still
   * surface as server errors.
   */
  async setDeckCommonBack(
    nodeId: string,
    backNodeId: string | null,
  ): Promise<{ result: "ok" | "not-a-deck" | "invalid-back" }> {
    const node = await this.getDeckNode(nodeId);
    if (!node) {
      return { result: "not-a-deck" };
    }
    if (backNodeId !== null) {
      const back = await this.repo.getNode(backNodeId);
      const isDeckImageChild =
        back?.parentFolderId === nodeId &&
        back.file?.contentType.startsWith("image/") === true &&
        back.file.isReady === 1;
      if (!isDeckImageChild) {
        return { result: "invalid-back" };
      }
    }
    await this.repo.setDeckCommonBack(nodeId, backNodeId);
    return { result: "ok" };
  }

  /** Set whether a Deck permits Face Down draws (Deck configuration). */
  async setDeckAllowFaceDown(
    nodeId: string,
    allowFaceDown: boolean,
  ): Promise<{ result: "ok" | "not-a-deck" }> {
    const node = await this.getDeckNode(nodeId);
    if (!node) {
      return { result: "not-a-deck" };
    }
    await this.repo.setDeckAllowFaceDown(nodeId, allowFaceDown);
    return { result: "ok" };
  }

  /**
   * A Deck's configuration for its owner to edit: whether Face Down draws are
   * permitted, the current Common Back, the Deck's image children to pick a
   * Common Back from, and its Cards each with their current Individual Back.
   * Owner-scoped — called against the owner's own DO.
   *
   * `cards` is the same derived Card list the draw path sees, so the editor and
   * a draw agree on what a Card is and what each Card's back resolves to. A Card
   * whose `back` came from the Common Back rather than a pairing is reported with
   * `individualBack: null`, so the editor shows only genuine per-Card pairings as
   * removable.
   */
  async getDeckSettings(nodeId: string): Promise<
    | {
        result: "ok";
        allowFaceDown: boolean;
        commonBack: { nodeId: string; name: string } | null;
        images: { nodeId: string; name: string }[];
        cards: {
          nodeId: string;
          name: string;
          individualBack: { nodeId: string; name: string } | null;
        }[];
      }
    | { result: "not-a-deck" }
  > {
    const node = await this.repo.getNode(nodeId);
    if (!node || !node.folder || node.folder.deck === null) {
      return { result: "not-a-deck" };
    }
    const derived = await this.deriveDeckImages(node);
    const cards = derived.images
      .filter(
        (image) =>
          image.nodeId !== derived.commonBack?.nodeId &&
          !derived.individualBackImageIds.has(image.nodeId),
      )
      .map((image) => ({
        nodeId: image.nodeId,
        name: image.name,
        individualBack: derived.individualBackByFront.get(image.nodeId) ?? null,
      }));
    return {
      result: "ok",
      allowFaceDown: node.folder.deck.allowFaceDown === 1,
      commonBack: derived.commonBack,
      images: derived.images,
      cards,
    };
  }

  /**
   * Pair a front Card Image with an Individual Back (or clear the pairing with
   * `backNodeId: null`). Owner-scoped. Both ids must be live, ready image
   * children of the Deck, and must differ; a back may serve only one front, so
   * setting one moves it off any front that already used it (see the repository).
   *
   * Rejections come back as typed results, not throws, so the caller can map
   * them to client errors while an unexpected store failure still surfaces as a
   * server error.
   */
  async setDeckIndividualBack(
    nodeId: string,
    frontNodeId: string,
    backNodeId: string | null,
  ): Promise<{
    result: "ok" | "not-a-deck" | "invalid-front" | "invalid-back";
  }> {
    const node = await this.getDeckNode(nodeId);
    if (!node) {
      return { result: "not-a-deck" };
    }

    const isDeckReadyImage = async (id: string) => {
      const child = await this.repo.getNode(id);
      return (
        child?.parentFolderId === nodeId &&
        child.file?.contentType.startsWith("image/") === true &&
        child.file.isReady === 1
      );
    };

    if (!(await isDeckReadyImage(frontNodeId))) {
      return { result: "invalid-front" };
    }

    if (backNodeId === null) {
      await this.repo.removeDeckIndividualBack(nodeId, frontNodeId);
      return { result: "ok" };
    }

    // A back must be a live image in the Deck, and cannot be the front's own
    // image — a Card cannot be its own back.
    if (frontNodeId === backNodeId || !(await isDeckReadyImage(backNodeId))) {
      return { result: "invalid-back" };
    }

    await this.repo.setDeckIndividualBack(nodeId, frontNodeId, backNodeId);
    return { result: "ok" };
  }

  async getFile(
    nodeId: string,
    { include = "live" }: { include?: "deleted" | "live" | "all" } = {},
  ): Promise<
    | {
        result: "found";
        data: Awaited<ReturnType<UserDataRepository["getFileNode"]>>;
      }
    | { result: "not_found" }
  > {
    const node = await this.repo.getFileNode(nodeId, { include });
    if (!node || !node.file) {
      return { result: "not_found" };
    }
    return {
      result: "found",
      data: node as RecursiveExpand<
        Omit<typeof node, "file"> & {
          file: Exclude<(typeof node)["file"], null>;
        }
      >,
    };
  }

  async isNodeAccessibleFromRoom({
    nodeId,
    roomId,
  }: {
    nodeId: string;
    roomId: string;
  }): Promise<boolean> {
    return this.repo.isNodeReachableFromShare(nodeId, roomId);
  }

  /**
   * The Cards of a Deck as this store sees them, for a draw from `roomId`.
   *
   * The Deck lives in the file store, so this is the layer that gets to say
   * what a Card is and whether the node is even a Deck. It:
   *  - authorises the node against the room's shares (never the room's own
   *    cache — see ADR-0001);
   *  - rejects a node that is not a folder marked as a Deck, so a draw cannot be
   *    aimed at an ordinary shared folder by bypassing the sidebar's filter;
   *  - derives Cards live from the Deck folder's direct, ready image children.
   *
   * `deckName` is returned so callers can label a Card Draw Message from an
   * authoritative source rather than trusting a caller-supplied name.
   *
   * Backs are attached per Card by {@link deriveDeckCards}: a Card's back is its
   * Individual Back if it has one, else the Deck's Common Back, else `null`. Any
   * image serving as a back (Common or Individual) "stops being a Card in its own
   * right" and is excluded from the Cards. A Card without a back can never come
   * up Face Down. `allowFaceDown` is Deck configuration and travels with the
   * Deck, so it is reported here for the draw to honour.
   */
  async getDeckCards({
    nodeId,
    roomId,
  }: {
    nodeId: string;
    roomId: string;
  }): Promise<
    | {
        result: "ok";
        deckName: string;
        allowFaceDown: boolean;
        cards: {
          nodeId: string;
          name: string;
          back: { nodeId: string; name: string } | null;
        }[];
      }
    | { result: "no-access" }
    | { result: "not-a-deck" }
  > {
    if (!this.repo.isNodeReachableFromShare(nodeId, roomId)) {
      return { result: "no-access" };
    }

    const node = await this.repo.getNode(nodeId);
    if (!node || !node.folder || node.folder.deck === null) {
      return { result: "not-a-deck" };
    }

    const derived = await this.deriveDeckImages(node);
    const cards = this.deriveDeckCards(derived);

    return {
      result: "ok",
      deckName: node.name,
      allowFaceDown: node.folder.deck.allowFaceDown === 1,
      cards,
    };
  }

  async shareNodeWithRoom({
    nodeId,
    roomId,
    roomDurableObjectId,
    userDisplayName,
  }: {
    nodeId: string;
    roomId: string;
    roomDurableObjectId: string;
    userDisplayName: string;
  }): Promise<NodeShareResult> {
    if (!this.userId) {
      return { result: "error", reason: "userId not found" };
    }

    const existing: DbShare | undefined = await this.repo.findShareWithNode(
      nodeId,
      roomDurableObjectId,
    );

    if (existing) {
      return {
        result: "existing",
        sharedItem: {
          dateShared: fixStringTimestampThatShouldBeEpochMs(
            existing.sharedTime,
          ),
          node: dbNodeToStorageNode(existing.node),
          userDisplayName,
          userId: this.userId,
        },
      };
    }

    const dbNode = await this.repo.getNode(nodeId);
    if (!dbNode) {
      return { result: "error", reason: `Node not found: ${nodeId}` };
    }

    // pre-flight: don't insert a share row for a file that isn't uploaded yet
    if (dbNode.file && dbNode.file.isReady !== 1) {
      return { result: "error", reason: "File is not ready to share yet" };
    }

    await this.repo.createShare({
      id: nanoid(),
      nodeId,
      roomId,
      roomDurableObjectId,
    });

    return {
      result: "created",
      sharedItem: {
        dateShared: Date.now(),
        node: dbNodeToStorageNode(dbNode),
        userDisplayName,
        userId: this.userId,
      },
    };
  }

  async unshareNodeFromRoom({
    nodeId,
    roomId,
    roomDurableObjectId,
  }: {
    nodeId: string;
    roomId: string;
    roomDurableObjectId: string;
  }): Promise<NodeUnshareResult> {
    const result = await this.repo.deleteShare(
      nodeId,
      roomId,
      roomDurableObjectId,
    );
    return result.rowsWritten > 0
      ? { result: "removed" }
      : { result: "not-found" };
  }

  /**
   * Read-only integrity report: folders whose stored `recursiveSizeBytes`
   * disagrees with the sum of their direct children. No repair is attempted.
   */
  async checkFolderSizes(): PromiseMaybeError<FolderSizeReport> {
    const discrepancies = this.repo
      .findFolderSizeDiscrepancies()
      .map((row) => ({
        folderId: row.folder_id,
        name: row.name,
        isDeleted: row.deleted_time !== null,
        storedBytes: row.stored,
        expectedBytes: row.expected,
        deltaBytes: row.stored - row.expected,
      }));

    return success({
      generatedAt: Date.now(),
      discrepancies,
    });
  }

  async recalculateFolderSizes(): Promise<FolderSizeRepairResult> {
    const recalculatedFolders = this.repo.recalculateAllFolderSizes();
    await this.syncQuotaWithSizes();

    return {
      generatedAt: Date.now(),
      recalculatedFolders,
    };
  }

  async cleanupMissingBlobs(
    missingBlobs: MissingBlobCleanupInput[],
  ): Promise<MissingBlobCleanupResult> {
    const bucket = cfEnv.PRIVATE_R2;
    if (!bucket) {
      throw new Error("PRIVATE_R2 bucket is not configured");
    }

    const deduped = new Map<string, MissingBlobCleanupInput>();
    const skipped: MissingBlobCleanupResult["skipped"] = [];
    for (const issue of missingBlobs) {
      const key = `${issue.kind}:${issue.nodeId}:${issue.r2Key}`;
      if (deduped.has(key)) {
        skipped.push({ ...issue, reason: "duplicate" });
        continue;
      }
      deduped.set(key, issue);
    }

    const fileIssues = [...deduped.values()].filter(
      (issue) => issue.kind === "file",
    );
    const thumbnailIssues = [...deduped.values()].filter(
      (issue) => issue.kind === "thumbnail",
    );

    const deletedNodeIds = new Set<string>();
    const thumbnailR2KeysToDelete = new Set<string>();
    let deletedFileRecords = 0;
    let clearedThumbnailReferences = 0;
    let remainingR2Checks = R2_REPAIR_SUBREQUEST_BUDGET;
    let deferred = 0;

    const fileRecords = await Promise.all(
      fileIssues.map(async (issue) => ({
        issue,
        file: await this.repo.getFileRecord(issue.nodeId),
      })),
    );
    const fileCandidates: {
      issue: MissingBlobCleanupInput;
      thumbnailR2Key: string | null;
    }[] = [];
    for (const { issue, file } of fileRecords) {
      if (!file?.node) {
        skipped.push({ ...issue, reason: "file-row-not-found" });
        continue;
      }
      if (file.r2Key !== issue.r2Key) {
        skipped.push({ ...issue, reason: "reported-key-changed" });
        continue;
      }

      fileCandidates.push({
        issue,
        thumbnailR2Key: file.thumbnailR2Key,
      });
    }

    const fileCandidatesToCheck = fileCandidates.slice(0, remainingR2Checks);
    remainingR2Checks -= fileCandidatesToCheck.length;
    for (const { issue } of fileCandidates.slice(
      fileCandidatesToCheck.length,
    )) {
      skipped.push({ ...issue, reason: "deferred-subrequest-budget" });
      deferred++;
    }

    const fileHeads = await processInBatches(
      fileCandidatesToCheck,
      R2_REPAIR_BATCH_SIZE,
      async ({ issue }) => ({
        issue,
        r2Object: await bucket.head(issue.r2Key),
      }),
    );
    const fileCandidateByNodeId = new Map(
      fileCandidates.map((candidate) => [candidate.issue.nodeId, candidate]),
    );
    const nodeIdsToDelete = new Set<string>();
    for (const { issue, r2Object } of fileHeads) {
      if (r2Object) {
        skipped.push({ ...issue, reason: "not-still-missing" });
        continue;
      }

      const candidate = fileCandidateByNodeId.get(issue.nodeId);
      if (candidate?.thumbnailR2Key) {
        thumbnailR2KeysToDelete.add(candidate.thumbnailR2Key);
      }
      nodeIdsToDelete.add(issue.nodeId);
      deletedNodeIds.add(issue.nodeId);
    }
    const nodeIdsToDeleteList = [...nodeIdsToDelete];
    // Same gap the purge and direct hard delete close: reaping a *shared* ready
    // file whose blob went missing cascades its share row, so capture the
    // affected shares before the delete and tell those rooms right after. No
    // R2 delete is coupled here (keys are returned for the caller), so a plain
    // post-delete notify suffices — no `finally` needed.
    const shareRows = this.repo.findSharesAtOrBelowNodes(nodeIdsToDeleteList);
    await this.repo.hardDeleteNodes(nodeIdsToDeleteList);
    deletedFileRecords = nodeIdsToDelete.size;
    if (this.userId) {
      await notifyRoomsOfShareRemoval(this.userId, shareRows);
    }

    const thumbnailIssuesToCheck: MissingBlobCleanupInput[] = [];
    for (const issue of thumbnailIssues) {
      if (deletedNodeIds.has(issue.nodeId)) {
        skipped.push({ ...issue, reason: "resolved-by-file-delete" });
        continue;
      }
      thumbnailIssuesToCheck.push(issue);
    }

    const thumbnailRecords = await Promise.all(
      thumbnailIssuesToCheck.map(async (issue) => ({
        issue,
        file: await this.repo.getFileRecord(issue.nodeId),
      })),
    );
    const thumbnailCandidates: MissingBlobCleanupInput[] = [];
    for (const { issue, file } of thumbnailRecords) {
      if (!file?.node) {
        skipped.push({ ...issue, reason: "file-row-not-found" });
        continue;
      }
      if (file.thumbnailR2Key !== issue.r2Key) {
        skipped.push({ ...issue, reason: "reported-key-changed" });
        continue;
      }

      thumbnailCandidates.push(issue);
    }

    const thumbnailCandidatesToCheck = thumbnailCandidates.slice(
      0,
      remainingR2Checks,
    );
    remainingR2Checks -= thumbnailCandidatesToCheck.length;
    for (const issue of thumbnailCandidates.slice(
      thumbnailCandidatesToCheck.length,
    )) {
      skipped.push({ ...issue, reason: "deferred-subrequest-budget" });
      deferred++;
    }

    const thumbnailHeads = await processInBatches(
      thumbnailCandidatesToCheck,
      R2_REPAIR_BATCH_SIZE,
      async (issue) => ({
        issue,
        r2Object: await bucket.head(issue.r2Key),
      }),
    );
    const thumbnailIdsToClear = new Set<string>();
    for (const { issue, r2Object } of thumbnailHeads) {
      if (r2Object) {
        skipped.push({ ...issue, reason: "not-still-missing" });
        continue;
      }

      thumbnailIdsToClear.add(issue.nodeId);
    }
    await this.repo.clearFileThumbnails([...thumbnailIdsToClear]);
    clearedThumbnailReferences = thumbnailIdsToClear.size;

    if (deletedFileRecords > 0) {
      this.repo.recalculateAllFolderSizes();
      await this.syncQuotaWithSizes();
    }

    return {
      generatedAt: Date.now(),
      requested: missingBlobs.length,
      deletedFileRecords,
      clearedThumbnailReferences,
      deferred,
      skipped,
      thumbnailR2KeysToDelete: [...thumbnailR2KeysToDelete],
    };
  }

  /**
   * Read-only reconciliation between the file table and the user's R2 blobs
   * (main files + thumbnails). Reports orphan blobs, missing blobs, and size
   * mismatches. No repair is attempted.
   */
  async checkR2Reconciliation(): PromiseMaybeError<R2ReconciliationReport> {
    if (!this.userId) {
      return error("User not found", "NOT_FOUND");
    }

    const bucket = cfEnv.PRIVATE_R2;
    if (!bucket) {
      throw new Error("PRIVATE_R2 bucket is not configured");
    }

    const filesPrefix = userFilesPrefix(this.userId);
    const thumbnailsPrefix = userFileThumbnailsPrefix(this.userId);

    const [fileBlobs, thumbnailBlobs] = await Promise.all([
      listAllR2Objects(bucket, filesPrefix),
      listAllR2Objects(bucket, thumbnailsPrefix),
    ]);

    // key -> size for every blob found in R2
    const blobSizes = new Map<string, number>();
    for (const blob of [...fileBlobs, ...thumbnailBlobs]) {
      blobSizes.set(blob.key, blob.size);
    }

    const files = await this.repo.getAllFiles();

    // every key referenced by a file row (main + thumbnail), regardless of
    // soft-delete — a soft-deleted file keeps its row and blob, so its blob is
    // legitimately referenced and must not be flagged as orphaned.
    const referencedKeys = new Set<string>();
    for (const file of files) {
      referencedKeys.add(file.r2Key);
      if (file.thumbnailR2Key) {
        referencedKeys.add(file.thumbnailR2Key);
      }
    }

    const missingBlobs: R2ReconciliationReport["missingBlobs"] = [];
    const sizeMismatches: R2ReconciliationReport["sizeMismatches"] = [];
    let readyFileRows = 0;

    for (const file of files) {
      const name = file.node?.name ?? "";

      // main blob is only expected once the file is marked ready
      if (file.isReady === 1) {
        readyFileRows++;
        const r2Size = blobSizes.get(file.r2Key);
        if (r2Size === undefined) {
          missingBlobs.push({
            nodeId: file.id,
            name,
            r2Key: file.r2Key,
            kind: "file",
          });
        } else if (r2Size !== file.sizeBytes) {
          sizeMismatches.push({
            nodeId: file.id,
            name,
            r2Key: file.r2Key,
            kind: "file",
            dbBytes: file.sizeBytes,
            r2Bytes: r2Size,
          });
        }
      }

      // thumbnail blob is expected whenever a thumbnail key is recorded
      if (file.thumbnailR2Key) {
        const r2Size = blobSizes.get(file.thumbnailR2Key);
        if (r2Size === undefined) {
          missingBlobs.push({
            nodeId: file.id,
            name,
            r2Key: file.thumbnailR2Key,
            kind: "thumbnail",
          });
        } else if (
          file.thumbnailSizeBytes !== null &&
          r2Size !== file.thumbnailSizeBytes
        ) {
          sizeMismatches.push({
            nodeId: file.id,
            name,
            r2Key: file.thumbnailR2Key,
            kind: "thumbnail",
            dbBytes: file.thumbnailSizeBytes,
            r2Bytes: r2Size,
          });
        }
      }
    }

    const orphanBlobs: R2ReconciliationReport["orphanBlobs"] = [];
    for (const [key, size] of blobSizes) {
      if (!referencedKeys.has(key)) {
        orphanBlobs.push({ key, sizeBytes: size });
      }
    }

    return success({
      generatedAt: Date.now(),
      prefixes: { files: filesPrefix, thumbnails: thumbnailsPrefix },
      totals: {
        blobsInR2: blobSizes.size,
        fileRowsInDb: files.length,
        readyFileRows,
      },
      orphanBlobs,
      missingBlobs,
      sizeMismatches,
    });
  }

  private async syncQuotaWithSizes(): PromiseMaybeError {
    if (!this.userId) {
      return error("User not found", "NOT_FOUND");
    }
    // we calculate this from scratch for now so as to reduce the chance of
    // quota usage getting or staying out of sync with reality
    const total = await this.repo.getRootSize();
    if (typeof total === "number") {
      await d1
        .update(users)
        .set({
          storage_used_bytes: total,
        })
        .where(eq(users.id, this.userId));
    }
    return success();
  }

  async destroy() {
    log(`Destroying UserDataDO ${this.ctx.id.toString()}`);
    if (this.userId) {
      const roomResults = await d1.query.rooms.findMany({
        where: {
          createdByUserId: this.userId,
        },
      });
      await Promise.all(
        roomResults.map((room) => {
          if (!room.durableObjectId) return Promise.resolve();
          return this.env.CHAT_ROOM_DO.get(
            this.env.CHAT_ROOM_DO.idFromString(room.durableObjectId),
          ).destroy();
        }),
      );
      await d1.delete(rooms).where(eq(rooms.createdByUserId, this.userId));
    }
    await this.ctx.storage.deleteAll();
  }
}
