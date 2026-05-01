import type { getUserNodes } from "./queries";

export type FileNode = Awaited<ReturnType<typeof getUserNodes>>[number];
