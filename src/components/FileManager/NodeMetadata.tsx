import { formatBytes } from "#/utils/formatBytes";
import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import { memo } from "react";

export const NodeMetadata = memo(({ node }: { node: StorageNode }) =>
  node.sizeBytes > 0 ? formatBytes(node.sizeBytes) : "Empty",
);

NodeMetadata.displayName = "NodeMetadata";
