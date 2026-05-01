import { Folder } from "lucide-react";
import { memo, useRef, useState } from "react";
import { actions } from "astro:actions";
import { fileTypeIcon } from "./fileTypeIcon";
import { formatBytes } from "./formatBytes";
import { KebabMenu } from "./KebabMenu";
import type { FileNode } from "./types";

export const FileListItem = memo(
  ({
    node,
    onClick,
    onDeleted,
    onRenamed,
  }: {
    node: FileNode;
    onClick: () => void;
    onDeleted: (nodeId: string) => void;
    onRenamed: (nodeId: string, newName: string) => void;
  }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(node.name);
    const [renameError, setRenameError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isFolder = !!node.folder;
    const Icon = isFolder
      ? Folder
      : fileTypeIcon(node.file?.content_type ?? "application/octet-stream");

    const handleDelete = async () => {
      const result = await actions.deleteNode({ nodeId: node.id });
      if (result.error) {
        console.error("Failed to delete:", result.error);
        return;
      }
      onDeleted(node.id);
    };

    const handleStartRename = () => {
      setRenameValue(node.name);
      setRenameError(null);
      setIsRenaming(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    };

    const handleCommitRename = async () => {
      const trimmed = renameValue.trim();
      if (!trimmed || trimmed === node.name) {
        setIsRenaming(false);
        setRenameError(null);
        return;
      }

      const result = await actions.renameNode({
        nodeId: node.id,
        newName: trimmed,
      });

      if (result.error) {
        setRenameError(result.error.message);
        return;
      }

      onRenamed(node.id, trimmed);
      setIsRenaming(false);
      setRenameError(null);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleCommitRename();
      } else if (e.key === "Escape") {
        setIsRenaming(false);
        setRenameError(null);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isRenaming) {
        onClick();
      }
    };

    return (
      <li>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-base-200 cursor-pointer text-left"
          onClick={isRenaming ? undefined : onClick}
          onKeyDown={isRenaming ? undefined : handleKeyDown}
        >
          <Icon
            size={20}
            className={isFolder ? "text-warning" : "text-base-content/70"}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            {isRenaming ? (
              <div className="flex flex-col gap-1">
                <input
                  ref={inputRef}
                  className="input input-sm input-bordered w-full"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.currentTarget.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={() => void handleCommitRename()}
                />
                {renameError && (
                  <span className="text-error text-xs">{renameError}</span>
                )}
              </div>
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>
          {node.file && (
            <span className="text-base-content/50 text-sm">
              {formatBytes(node.file.size_bytes)}
            </span>
          )}
          <KebabMenu onRename={handleStartRename} onDelete={handleDelete} />
        </button>
      </li>
    );
  },
);

FileListItem.displayName = "FileListItem";
