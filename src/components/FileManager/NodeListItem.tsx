import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import { NodeActionsMenu } from "./NodeActionsMenu";
import { NodeIcon } from "./NodeIcon";
import { NodeMetadata } from "./NodeMetadata";
import { useRename } from "./useRename";
import { memo } from "react";

export const NodeListItem = memo(
  ({
    node,
    onClick,
    onRefresh,
    onRenamed,
    viewMode = "list",
    ownerUserId,
    roomId,
    readOnly = false,
  }: {
    node: StorageNode;
    onClick: () => void;
    onRefresh: () => void;
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
            group-data-list:items-center group-data-list:gap-3
            disabled:cursor-not-allowed"
          onClick={isRenaming ? undefined : onClick}
          onKeyDown={isRenaming ? undefined : handleKeyDown}
          disabled={!!node.deletedTime}
        >
          <div
            className="bg-base-200 flex items-center justify-center
              overflow-hidden rounded group-data-grid:aspect-square
              group-data-grid:w-full group-data-list:size-10
              group-data-list:shrink-0"
          >
            <NodeIcon
              node={node}
              ownerUserId={ownerUserId}
              roomId={roomId}
              size={viewMode === "list" ? "20" : "60"}
              strokeWidth={viewMode === "list" ? "2" : "1"}
            />
          </div>
          <div className="flex min-w-0 flex-col group-data-list:flex-1">
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
              <span
                className="group-data-deleted:text-error-text line-clamp-2
                  text-sm"
              >
                {node.name}
                {node.kind === "folder" && node.isDeck && (
                  <span className="badge badge-ghost badge-sm ml-2 align-middle">
                    Deck
                  </span>
                )}
              </span>
            )}
          </div>
          <span className="text-base-content/50 text-sm">
            <NodeMetadata node={node} />
          </span>
        </button>
        <div
          className="group-data-grid:absolute group-data-grid:top-2
            group-data-grid:right-2"
        >
          <NodeActionsMenu
            node={node}
            onRefresh={onRefresh}
            readOnly={readOnly}
            onStartRename={handleStartRename}
            ownerUserId={ownerUserId}
            roomId={roomId}
          />
        </div>
      </li>
    );
  },
);

NodeListItem.displayName = "FileListItem";
