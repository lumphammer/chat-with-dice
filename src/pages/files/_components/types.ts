import type { UserDataDO } from "#/workers/UserDataDO/UserDataDO";

export type FileNode = Awaited<
  ReturnType<InstanceType<typeof UserDataDO>["getNodes"]>
>[number];
