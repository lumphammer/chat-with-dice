import { formatBytes } from "#/utils/formatBytes";
import { KebabMenu } from "./KebabMenu";
import { fileTypeIcon } from "./fileTypeIcon";
import { buildFileUrl } from "./fileUrl";
import type { FileNode } from "./types";
import { useRename } from "./useRename";
import { Folder } from "lucide-react";
import { memo } from "react";

export const FileListItem = memo(
  ({
    node,
    onClick,
    onDeleted,
    onRenamed,
    viewMode = "list",
    ownerUserId,
    roomId,
    readOnly = false,
  }: {
    node: FileNode;
    onClick: () => void;
    onDeleted: (nodeId: string) => void;
    onRenamed: (nodeId: string, newName: string) => void;
    viewMode?: "list" | "grid";
    ownerUserId?: string;
    roomId?: string;
    readOnly?: boolean;
  }) => {
    const {
      handleStartRename,
      handleCommitRename,
      handleRenameKeyDown,
      handleKeyDown,
      isRenaming,
      inputRef,
      renameValue,
      setRenameValue,
      renameError,
    } = useRename({ node, onClick, onRenamed });

    const isFolder = !!node.folder;
    const Icon = isFolder
      ? Folder
      : fileTypeIcon(
          node.file?.contentType ?? "application/octet-stream",
          !!node.deletedTime,
        );
    const thumbnailUrl = node.file?.thumbnailR2Key
      ? buildFileUrl(ownerUserId, node.id, {
          roomId,
          suffix: "thumbnail",
        })
      : null;

    const metadata = node.file
      ? formatBytes(node.file.sizeBytes)
      : node.folder
        ? node.folder.recursiveSizeBytes > 0
          ? formatBytes(node.folder.recursiveSizeBytes)
          : "Empty"
        : null;

    const icon =
      thumbnailUrl && !node.deletedTime ? (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon
          size={48}
          className={
            node.deletedTime
              ? "text-error-text"
              : isFolder
                ? "text-primary/70"
                : "text-base-content/70"
          }
          strokeWidth={1.5}
        />
      );

    const name = isRenaming ? (
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
      <span className="group-data-deleted:text-error-text line-clamp-2 text-sm">
        {node.name}
      </span>
    );

    return (
      <li
        className="hover:bg-base-300 group relative flex rounded-lg p-2
          data-grid:flex-col data-list:items-center data-list:gap-3"
        data-deleted={node.deletedTime ? true : undefined}
        data-grid={viewMode === "grid" ? true : undefined}
        data-list={viewMode === "list" ? true : undefined}
      >
        <button
          type="button"
          className="flex min-w-0 cursor-pointer text-left
            group-data-grid:flex-col group-data-list:flex-1
            group-data-list:items-center group-data-list:gap-3"
          onClick={isRenaming ? undefined : onClick}
          onKeyDown={isRenaming ? undefined : handleKeyDown}
        >
          <div
            className="bg-base-200 flex items-center justify-center
              overflow-hidden rounded group-data-grid:aspect-square
              group-data-grid:w-full group-data-list:size-10
              group-data-list:shrink-0"
          >
            {icon}
          </div>
          <div className="flex min-w-0 flex-col group-data-list:flex-1">
            {name}
            {metadata && (
              <span
                className="text-base-content/50 text-sm group-data-list:hidden"
              >
                {metadata}
              </span>
            )}
          </div>
          {metadata && (
            <span
              className="text-base-content/50 text-sm group-data-grid:hidden"
            >
              {metadata}
            </span>
          )}
        </button>
        <div
          className="group-data-grid:absolute group-data-grid:top-2
            group-data-grid:right-2"
        >
          <KebabMenu
            node={node}
            onDeleted={onDeleted}
            isDeleted={!!node.deletedTime}
            readOnly={readOnly}
            onRename={handleStartRename}
          />
        </div>
      </li>
    );
  },
);

FileListItem.displayName = "FileListItem";
