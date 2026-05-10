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
