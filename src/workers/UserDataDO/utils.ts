import { fixStringTimestampThatShouldBeEpochMs } from "#/utils/fixStringTimestampThatShouldBeEpochMs.ts";
import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import type { DbNode } from "./DbNodeType";

export const log = console.log.bind(console, "[UserDataDO]");
export const logError = console.error.bind(console, "[UserDataDO]");

export function isUniqueConstraintError(error: unknown): error is Error {
  // Drizzle now wraps query failures in a `DrizzleQueryError` whose own message
  // is just "Failed query: ..."; the underlying SQLite error (which carries the
  // "UNIQUE constraint failed" text) hangs off `.cause`. Walk the cause chain so
  // we catch it whether it's on the top-level error or nested.
  for (
    let current: unknown = error;
    current instanceof Error;
    current = current.cause
  ) {
    if (current.message.includes("UNIQUE constraint failed")) {
      return true;
    }
  }
  return false;
}

/** List every object under `prefix`, following R2's truncation cursor. */
export async function listAllR2Objects(
  bucket: R2Bucket,
  prefix: string,
): Promise<{ key: string; size: number }[]> {
  const out: { key: string; size: number }[] = [];
  let cursor: string | undefined;
  for (;;) {
    // each page's cursor depends on the previous response, so this is
    // inherently sequential
    // eslint-disable-next-line no-await-in-loop
    const res = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const o of res.objects) {
      out.push({ key: o.key, size: o.size });
    }
    if (!res.truncated) break;
    cursor = res.cursor;
  }
  return out;
}

export const dbNodeToStorageNode = (dbNode: DbNode): StorageNode => {
  if (dbNode.folder) {
    return {
      version: 2,
      kind: "folder",
      createdTime: fixStringTimestampThatShouldBeEpochMs(dbNode.createdTime),
      deletedTime: dbNode.deletedTime,
      id: dbNode.id,
      name: dbNode.name,
      parentFolderId: dbNode.parentFolderId,
      sizeBytes: dbNode.folder.recursiveSizeBytes,
      isDeck: dbNode.folder.deck !== null,
    };
  }
  if (dbNode.file) {
    return {
      version: 2,
      kind: "file",
      createdTime: fixStringTimestampThatShouldBeEpochMs(dbNode.createdTime),
      deletedTime: dbNode.deletedTime,
      id: dbNode.id,
      name: dbNode.name,
      parentFolderId: dbNode.parentFolderId,
      sizeBytes: dbNode.file.sizeBytes,
      contentType: dbNode.file.contentType,
      thumbnailContentType: dbNode.file.thumbnailContentType,
      thumbnailSizeBytes: dbNode.file.thumbnailSizeBytes,
    };
  }
  throw new Error(
    `This node is neither a file nor a folder\n${JSON.stringify(dbNode)}`,
  );
};
