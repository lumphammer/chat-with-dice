import { HardDeleteDialog } from "./HardDeleteDialog";
import type { FileNode } from "./types";
import { useShareWithRoom } from "./useShareWithRoom";
import { actions } from "astro:actions";
import {
  EllipsisVertical,
  Pencil,
  Share2,
  Trash2,
  Unlink2,
  RefreshCcwDot,
} from "lucide-react";
import { memo, useId, useRef } from "react";

export const KebabMenu = memo(
  ({
    node,
    onRename,
    onRefresh,
    isDeleted,
    readOnly,
  }: {
    node: FileNode;
    onRename: () => void;
    onRefresh: () => void;
    isDeleted: boolean;
    readOnly: boolean;
  }) => {
    const {
      canShareWithRoom,
      canUnshareFromRoom,
      shareWithRoom,
      unshareFromRoom,
      isSharedWithRoom,
    } = useShareWithRoom(node.id, readOnly);

    const handleDelete = async () => {
      const result = await actions.files.deleteNode({ nodeId: node.id });
      if (result.error) {
        console.error("Failed to delete:", result.error);
        return;
      }
      onRefresh();
    };

    const handleRestore = async () => {
      const result = await actions.files.restoreNode({ nodeId: node.id });
      console.log("restoring", node.id, result);
      if (result.error) {
        console.error("Failed to restore:", result.error);
        return;
      }
      onRefresh();
    };

    const menuId = useId();
    const menuRef = useRef<HTMLDivElement>(null);
    const anchorName = `--kebab-${menuId.replaceAll(":", "")}`;
    const isLive = !isDeleted;

    const handleAction = (action?: () => void) => {
      menuRef.current?.hidePopover();
      action?.();
    };

    const hasAnyAction =
      (isLive && (canShareWithRoom || canUnshareFromRoom || !readOnly)) ||
      (isDeleted && !readOnly);
    if (!hasAnyAction) return null;

    return (
      <>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle"
          popoverTarget={menuId}
          style={{ anchorName } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <EllipsisVertical size={14} />
        </button>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- popover menu, keyboard handled by menu items */}
        <div
          id={menuId}
          ref={menuRef}
          popover="auto"
          className="dropdown rounded-box bg-base-100 ring-accent w-44 shadow-lg
            ring"
          style={{ positionAnchor: anchorName } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="menu w-full p-1">
            {isLive && canShareWithRoom && (
              <li>
                <button
                  type="button"
                  onClick={() => handleAction(shareWithRoom)}
                >
                  <Share2 size={14} />
                  {isSharedWithRoom ? "Reshare..." : "Share with room"}
                </button>
              </li>
            )}
            {canUnshareFromRoom && (
              <li>
                <button
                  type="button"
                  onClick={() => handleAction(unshareFromRoom)}
                >
                  <Unlink2 size={14} />
                  Unshare
                </button>
              </li>
            )}
            {isLive && !readOnly && (
              <li>
                <button type="button" onClick={() => handleAction(onRename)}>
                  <Pencil size={14} />
                  Rename
                </button>
              </li>
            )}
            {isLive && !readOnly && (
              <li>
                <button
                  type="button"
                  className="text-error-text"
                  onClick={() => handleAction(handleDelete)}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </li>
            )}
            {isDeleted && !readOnly && (
              <li>
                <HardDeleteDialog
                  name={node.name}
                  nodeId={node.id}
                  onAfterDelete={onRefresh}
                />
              </li>
            )}
            {isDeleted && !readOnly && (
              <li>
                <button
                  type="button"
                  className=""
                  // this needs to be a hard delete action
                  onClick={() => handleAction(handleRestore)}
                >
                  <RefreshCcwDot size={14} />
                  Restore
                </button>
              </li>
            )}
          </ul>
        </div>
      </>
    );
  },
);

KebabMenu.displayName = "KebabMenu";
