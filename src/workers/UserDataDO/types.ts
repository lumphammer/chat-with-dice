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
    storedBytes: number;
    expectedBytes: number;
    deltaBytes: number; // stored - expected
  }[];
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
