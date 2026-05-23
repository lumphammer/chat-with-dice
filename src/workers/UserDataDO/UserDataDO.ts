import { db as d1 } from "#/db";
import { users } from "#/schemas/coreD1-schema";
import type { NodeShareResult, NodeUnshareResult } from "../ChatRoomDO/types";
import { UserDataRepository } from "./UserDataRepository";
import type { PathResolution } from "./types";
import { isUniqueConstraintError, log, logError } from "./utils";
import { DurableObject } from "cloudflare:workers";
import { nanoid } from "nanoid";

type NodeForShare = {
  name: string;
  file: {
    isReady: number;
    r2Key: string;
    thumbnailR2Key: string | null;
    contentType: string;
    sizeBytes: number;
  } | null;
};

export class UserDataDO extends DurableObject {
  private repo!: UserDataRepository;
  private userId!: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    log(
      "\n\n=====================================\nUserDataDO id booting:",
      ctx.id.toString(),
    );

    void this.ctx.blockConcurrencyWhile(async () => {
      this.userId = await this.resolveUserId();
      this.repo = new UserDataRepository(ctx);
    });
  }

  /**
   * Get the cached userId (it should never change), or if it's not in KV, look
   * up our DO id in D1 to find the user and cache it.
   */
  private async resolveUserId(): Promise<string> {
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
      throw new Error(
        `User does not exist in database with user_data_do_id ${this.ctx.id.toString()}`,
      );
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

  getNodes(folderId?: string | null) {
    return this.repo.findChildNodes(folderId);
  }

  async createFolder(name: string, parentFolderId?: string | null) {
    const id = nanoid();
    try {
      await this.repo.createFolder(id, name, parentFolderId);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("A folder with that name already exists here", {
          cause: error,
        });
      }
      throw error;
    }
    return { id, name };
  }

  async softDeleteNode(nodeId: string) {
    const node = await this.repo.findNodeWithRelations(nodeId);
    if (!node) {
      throw new Error("File or folder not found");
    }

    await this.repo.setNodeDeletedTime(nodeId, Date.now());

    const sizeToSubtract = node.file
      ? node.file.sizeBytes
      : (node.folder?.recursiveSizeBytes ?? 0);

    if (node.parentFolderId && sizeToSubtract > 0) {
      this.repo.adjustAncestorSizes(node.parentFolderId, -sizeToSubtract);
    }
    await this.syncQuotaWithSizes();
  }

  async hardDeleteNode(nodeId: string) {
    await this.repo.hardDeleteNode(nodeId);
  }

  async createFile(
    filename: string,
    contentType: string,
    folderId: string | null | undefined,
  ) {
    const id = crypto.randomUUID();
    const r2Key = `user-files/${this.userId}/${id}`;
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
        throw new Error("A file with that name already exists in this folder", {
          cause,
        });
      }
      throw cause;
    }
    return { id, r2Key };
  }

  async markFileReady(id: string, sizeBytes: number, folderId?: string | null) {
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
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error(
          "An item with that name already exists in this folder",
          { cause: error },
        );
      }
      throw error;
    }
  }

  async getFile(nodeId: string) {
    const node = await this.repo.findNodeWithReadyFile(nodeId);
    if (!node || !node.file) {
      throw new Error(`File not found in database: ${nodeId}`);
    }
    return node as RecursiveExpand<
      Omit<typeof node, "file"> & { file: Exclude<(typeof node)["file"], null> }
    >;
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

  async shareNodeWithRoom({
    nodeId,
    roomId,
    roomDurableObjectId,
  }: {
    nodeId: string;
    roomId: string;
    roomDurableObjectId: string;
  }): Promise<NodeShareResult> {
    const existing = await this.repo.findShareWithNode(
      nodeId,
      roomDurableObjectId,
    );
    if (existing) {
      return this.toShareResult("existing", existing.node);
    }

    const node = await this.repo.findNodeWithRelations(nodeId);
    if (!node) {
      return { result: "error", reason: `Node not found: ${nodeId}` };
    }

    // pre-flight: don't insert a share row for a file that isn't uploaded yet
    if (node.file && node.file.isReady !== 1) {
      return { result: "error", reason: "File is not ready to share yet" };
    }

    await this.repo.createShare({
      id: nanoid(),
      nodeId,
      roomId,
      roomDurableObjectId,
    });

    return this.toShareResult("created", node);
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

  private toShareResult(
    status: "existing" | "created",
    node: NodeForShare,
  ): NodeShareResult {
    const { file } = node;
    if (file) {
      // re-check here for the existing-share path; harmless for created
      if (file.isReady !== 1) {
        return { result: "error", reason: "File is not ready to share yet" };
      }
      return {
        result: status,
        kind: "file",
        name: node.name,
        r2Key: file.r2Key,
        thumbnailR2Key: file.thumbnailR2Key,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
      };
    }
    return {
      result: status,
      kind: "folder",
      name: node.name,
    };
  }

  private async syncQuotaWithSizes() {
    // we calculate this from scratch for now so as to reduce the chance of
    // quota usage getting or staying out of sync with reality
    const total = await this.repo.getRootSize();
    if (typeof total === "number") {
      await d1.update(users).set({
        storage_used_bytes: total,
      });
    }
  }
}
