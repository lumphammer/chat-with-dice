import { formatBytes } from "#/utils/formatBytes";
import { KebabMenu } from "./KebabMenu";
import { fileTypeIcon } from "./fileTypeIcon";
import { buildFileUrl } from "./fileUrl";
import type { FileNode } from "./types";
import { useShareWithRoom } from "./useShareWithRoom";
import { actions } from "astro:actions";
import { Folder } from "lucide-react";
import { memo, useRef, useState } from "react";

export const FileListItem = memo(
  ({
    node,
    onClick,
    onDeleted,
    onRenamed,
    variant = "list",
    ownerUserId,
    roomId,
    readOnly = false,
  }: {
    node: FileNode;
    onClick: () => void;
    onDeleted: (nodeId: string) => void;
    onRenamed: (nodeId: string, newName: string) => void;
    variant?: "list" | "grid";
    ownerUserId?: string;
    roomId?: string;
    readOnly?: boolean;
  }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(node.name);
    const [renameError, setRenameError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const {
      canShareWithRoom,
      shareWithRoom,
      canUnshareFromRoom,
      unshareFromRoom,
      isSharedWithRoom,
    } = useShareWithRoom(readOnly ? null : node.id);

    const isFolder = !!node.folder;
    const Icon = isFolder
      ? Folder
      : fileTypeIcon(node.file?.contentType ?? "application/octet-stream");
    const thumbnailUrl = node.file?.thumbnailR2Key
      ? buildFileUrl(ownerUserId, node.id, {
          roomId,
          suffix: "thumbnail",
        })
      : null;

    const handleDelete = async () => {
      const result = await actions.files.deleteNode({ nodeId: node.id });
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

      const result = await actions.files.renameNode({
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

    const metadata = node.file
      ? formatBytes(node.file.sizeBytes)
      : node.folder
        ? node.folder.recursiveSizeBytes > 0
          ? formatBytes(node.folder.recursiveSizeBytes)
          : "Empty"
        : null;

    if (variant === "grid") {
      return (
        <li
          className="group hover:bg-base-200 relative flex min-w-0 flex-col
            rounded-lg p-2 transition-colors"
        >
          <button
            type="button"
            className="flex min-w-0 cursor-pointer flex-col gap-2 text-left"
            onClick={isRenaming ? undefined : onClick}
            onKeyDown={isRenaming ? undefined : handleKeyDown}
          >
            <div
              className="bg-base-200 flex aspect-square w-full items-center
                justify-center overflow-hidden rounded"
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon
                  size={48}
                  className={isFolder ? "text-warning" : "text-base-content/60"}
                  strokeWidth={1.5}
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1 px-1">
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
                <span className="line-clamp-2 min-h-10 text-sm leading-5">
                  {node.name}
                </span>
              )}
              {metadata && (
                <span className="text-base-content/50 truncate text-xs">
                  {metadata}
                </span>
              )}
            </div>
          </button>
          <div className="absolute top-2 right-2">
            <KebabMenu
              onRename={readOnly ? undefined : handleStartRename}
              onDelete={readOnly ? undefined : handleDelete}
              isSharedWithRoom={isSharedWithRoom}
              onShareWithRoom={
                readOnly
                  ? undefined
                  : canShareWithRoom
                    ? shareWithRoom
                    : undefined
              }
              onUnshareFromRoom={
                readOnly
                  ? undefined
                  : canUnshareFromRoom
                    ? unshareFromRoom
                    : undefined
              }
            />
          </div>
        </li>
      );
    }

    return (
      <li
        className="hover:bg-base-200 flex min-w-0 items-center gap-3 rounded-lg
          px-3 py-2 transition-colors"
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3
            text-left"
          onClick={isRenaming ? undefined : onClick}
          onKeyDown={isRenaming ? undefined : handleKeyDown}
        >
          <span
            className="bg-base-200 flex size-10 shrink-0 items-center
              justify-center overflow-hidden rounded"
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <Icon
                size={20}
                className={isFolder ? "text-warning" : "text-base-content/70"}
              />
            )}
          </span>
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
              <span className="block truncate">{node.name}</span>
            )}
          </div>
          {metadata && (
            <span className="text-base-content/50 text-sm">{metadata}</span>
          )}
        </button>
        <KebabMenu
          onRename={readOnly ? undefined : handleStartRename}
          onDelete={readOnly ? undefined : handleDelete}
          isSharedWithRoom={isSharedWithRoom}
          onShareWithRoom={
            readOnly ? undefined : canShareWithRoom ? shareWithRoom : undefined
          }
          onUnshareFromRoom={
            readOnly
              ? undefined
              : canUnshareFromRoom
                ? unshareFromRoom
                : undefined
          }
        />
      </li>
    );
  },
);

FileListItem.displayName = "FileListItem";
