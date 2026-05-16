import type { UserDataDO } from "#/workers/UserDataDO/UserDataDO";

export type FileNode = Awaited<
  ReturnType<InstanceType<typeof UserDataDO>["getNodes"]>
>[number];

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
