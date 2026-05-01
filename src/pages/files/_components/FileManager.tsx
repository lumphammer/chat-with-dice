import { type getUserNodes } from "./queries";
import { memo, useMemo, useState } from "react";

export const FileManager = memo(
  ({
    initialNodes,
  }: {
    initialNodes: Awaited<ReturnType<typeof getUserNodes>>;
  }) => {
    const [nodes, setNodes] = useState(initialNodes);

    const filesNodes = useMemo(
      () => nodes.filter((node) => node.file),
      [nodes],
    );
    const folderNodes = useMemo(
      () => nodes.filter((node) => node.folder),
      [nodes],
    );

    return (
      <div>
        <h2>Files</h2>
        <ul>
          {filesNodes.map((fileNode) => (
            <li key={fileNode.id}>{fileNode.name}</li>
          ))}
        </ul>
        <h2>Folders</h2>
        <ul>
          {folderNodes.map((folderNode) => (
            <li key={folderNode.id}>{folderNode.name}</li>
          ))}
        </ul>
      </div>
    );
  },
);

FileManager.displayName = "FileManager";
