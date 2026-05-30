import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
} from "#/constants";
import { db as d1 } from "#/db";
import { users } from "#/schemas/coreD1-schema";
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
import type { NodeShareResult, NodeUnshareResult } from "../ChatRoomDO/types";
import { UserDataRepository } from "./UserDataRepository";
import type {
  FolderSizeReport,
  FolderSizeRepairResult,
  MissingBlobCleanupInput,
  MissingBlobCleanupResult,
  PathResolution,
  R2ReconciliationReport,
} from "./types";
import {
  isUniqueConstraintError,
  listAllR2Objects,
  log,
  logError,
} from "./utils";
import { DurableObject } from "cloudflare:workers";
import { env as cfEnv } from "cloudflare:workers";
import { eq } from "drizzle-orm";
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

  async getNodes(folderId: string | null | undefined, includeDeleted: boolean) {
    if (folderId) {
      const folderNode = await this.repo.getNode(folderId);
      if (!folderNode) {
        throw new Error("Folder not found");
      }
      if (folderNode.deletedTime) {
        throw new Error("Folder is deleted");
      }
    }
    return await this.repo.getChildNodes(folderId, includeDeleted);
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

  async softDeleteNode(nodeId: string) {
    const node = await this.repo.getNode(nodeId);
    if (!node) {
      throw new Error("File or folder not found");
    }

    await this.repo.softDeleteNode(nodeId);

    const sizeToSubtract = node.file
      ? node.file.sizeBytes
      : (node.folder?.recursiveSizeBytes ?? 0);

    if (node.parentFolderId && sizeToSubtract > 0) {
      this.repo.adjustAncestorSizes(node.parentFolderId, -sizeToSubtract);
    }
    await this.syncQuotaWithSizes();
  }

  async restoreNode(nodeId: string) {
    log("restoring", nodeId);
    const node = await this.repo.getNode(nodeId, { include: "deleted" });
    if (!node) {
      return error("Node not found or not soft deleted", HTTP_NOT_FOUND);
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
      return error("User not found", HTTP_BAD_REQUEST);
    }

    const sizeBytes =
      node.file?.sizeBytes ?? node.folder?.recursiveSizeBytes ?? 0;

    if (usage.storage_used_bytes + sizeBytes > usage.storage_quota_bytes) {
      return error("Storage quota exceeded", HTTP_BAD_REQUEST);
    }

    // check shadowedness
    const isShadowed = this.repo.isNodeShadowedByADeletedFolder(nodeId);
    if (isShadowed) {
      return error("Node is shadowed by a deleted folder", HTTP_BAD_REQUEST);
    }

    try {
      await this.repo.restoreNode(nodeId);
    } catch (cause) {
      logError(cause);
      if (isUniqueConstraintError(cause)) {
        return error(
          "A file with that name already exists in this folder",
          HTTP_BAD_REQUEST,
        );
      }
      return error(
        "Failed to restore file: ${}",
        HTTP_INTERNAL_SERVER_ERROR,
        cause,
      );
    }

    if (node.parentFolderId) {
      this.repo.adjustAncestorSizes(node.parentFolderId, sizeBytes);
    }

    await this.syncQuotaWithSizes();
    return success(undefined);
  }

  /**
   * hard-delete nodes regardless of current soft-deletion status
   */
  async dangerouslyHardDeleteNodes(nodeIds: string[]) {
    const r2Keys = this.repo.recursivelyGetDescendantR2Keys(nodeIds);
    await this.repo.hardDeleteNodes(nodeIds);
    // this isn't batched, but this path is only used by user-initiated actions
    // and upload cleanup, so there will never be more than a few.
    // we're doing the db operation and the r2 operation sequentially to avoid
    // the possibility of nuking r2 blobs while the db operation fails and
    // leaves records in the db.
    await cfEnv.PRIVATE_R2?.delete(r2Keys);
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
        HTTP_NOT_FOUND,
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
          HTTP_BAD_REQUEST,
        );
      }
      return error(
        "Failed to create file: ${}",
        HTTP_INTERNAL_SERVER_ERROR,
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

  async getFile(nodeId: string): Promise<
    | {
        result: "found";
        data: Awaited<ReturnType<UserDataRepository["getFileNode"]>>;
      }
    | { result: "not_found" }
  > {
    const node = await this.repo.getFileNode(nodeId);
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

    const node = await this.repo.getNode(nodeId);
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

  /**
   * Read-only integrity report: folders whose stored `recursiveSizeBytes`
   * disagrees with the sum of their direct children. No repair is attempted.
   */
  async checkFolderSizes(): Promise<FolderSizeReport> {
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

    return {
      generatedAt: Date.now(),
      discrepancies,
    };
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
    await this.repo.hardDeleteNodes([...nodeIdsToDelete]);
    deletedFileRecords = nodeIdsToDelete.size;

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
  async checkR2Reconciliation(): Promise<R2ReconciliationReport> {
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

    return {
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
    };
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
      await d1
        .update(users)
        .set({
          storage_used_bytes: total,
        })
        .where(eq(users.id, this.userId));
    }
  }
}
