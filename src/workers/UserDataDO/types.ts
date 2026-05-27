export type PathResolution =
  | { kind: "folder"; folderId: string | null; breadcrumbs: Breadcrumb[] }
  | {
      kind: "file";
      folderId: string | null;
      fileNodeId: string;
      breadcrumbs: Breadcrumb[];
    }
  | { kind: "not-found" };

type Breadcrumb = { id: string; name: string };

export type FolderSizeReport = {
  generatedAt: number;
  discrepancies: {
    folderId: string;
    name: string;
    isDeleted: boolean;
    storedBytes: number;
    expectedBytes: number;
    deltaBytes: number; // stored - expected
  }[];
};

export type FolderSizeRepairResult = {
  generatedAt: number;
  recalculatedFolders: number;
};

type R2Issue = {
  nodeId: string;
  name: string;
  r2Key: string;
  kind: "file" | "thumbnail";
};

export type R2ReconciliationReport = {
  generatedAt: number;
  prefixes: { files: string; thumbnails: string };
  totals: { blobsInR2: number; fileRowsInDb: number; readyFileRows: number };
  // in R2 but not referenced by any file row
  orphanBlobs: { key: string; sizeBytes: number }[];
  // referenced and expected present, but absent in R2
  missingBlobs: R2Issue[];
  sizeMismatches: (R2Issue & { dbBytes: number; r2Bytes: number })[];
};

export type R2OrphanCleanupResult = {
  generatedAt: number;
  requested: number;
  deleted: number;
  deferred: number;
  skipped: { key: string; reason: string }[];
  failed: { key: string; reason: string }[];
};

export type MissingBlobCleanupInput = {
  nodeId: string;
  r2Key: string;
  kind: "file" | "thumbnail";
};

export type MissingBlobCleanupResult = {
  generatedAt: number;
  requested: number;
  deletedFileRecords: number;
  clearedThumbnailReferences: number;
  deferred: number;
  skipped: (MissingBlobCleanupInput & { reason: string })[];
  thumbnailR2KeysToDelete: string[];
};

export type MissingStorageCleanupResult = MissingBlobCleanupResult & {
  deletedThumbnailObjects: number;
  thumbnailObjectDeleteFailures: { key: string; reason: string }[];
};
