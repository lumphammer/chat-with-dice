export type BreadcrumbSegment = {
  id: string;
  name: string;
};

export type FileManagerLocation = {
  folderId: string | null;
  breadcrumbs: BreadcrumbSegment[];
  previewFileId: string | null;
  previewFileName: string | null;
};
