import { formatBytes } from "#/utils/formatBytes";
import type { FileNode } from "./types";
import { memo } from "react";

export const NodeMetadata = memo(({ node }: { node: FileNode }) =>
  node.file
    ? formatBytes(node.file.sizeBytes)
    : node.folder
      ? node.folder.recursiveSizeBytes > 0
        ? formatBytes(node.folder.recursiveSizeBytes)
        : "Empty"
      : null,
);

NodeMetadata.displayName = "NodeMetadata";
