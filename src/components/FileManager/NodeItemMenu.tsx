import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import { GenericMenu, useGenericMenu } from "./GenericMenu";
import { HardDeleteDialog } from "./HardDeleteDialog";
import { useShareWithRoom } from "./useShareWithRoom";
import { actions } from "astro:actions";
import { Pencil, Share2, Trash2, Unlink2, RefreshCcwDot } from "lucide-react";
import { memo } from "react";

export const NodeItemMenu = memo(
  ({
    isDeleted,
    node,
    onRefresh,
    onStartRename,
    readOnly,
  }: {
    isDeleted: boolean;
    node: StorageNode;
    onRefresh: () => void;
    onStartRename: () => void;
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
    const isLive = !isDeleted;

    const { genericMenu, wrapMenuAction } = useGenericMenu();

    const hasAnyAction =
      (isLive && (canShareWithRoom || canUnshareFromRoom || !readOnly)) ||
      (isDeleted && !readOnly);
    if (!hasAnyAction) return null;

    return (
      <GenericMenu
        icon="vertical_kebab"
        label="Actions"
        genericMenu={genericMenu}
      >
        {isLive && canShareWithRoom && (
          <li>
            <button type="button" onClick={wrapMenuAction(shareWithRoom)}>
              <Share2 size={14} />
              {isSharedWithRoom ? "Reshare..." : "Share with room"}
            </button>
          </li>
        )}
        {canUnshareFromRoom && (
          <li>
            <button type="button" onClick={wrapMenuAction(unshareFromRoom)}>
              <Unlink2 size={14} />
              Unshare
            </button>
          </li>
        )}
        {isLive && !readOnly && (
          <li>
            <button type="button" onClick={wrapMenuAction(onStartRename)}>
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
              onClick={wrapMenuAction(handleDelete)}
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
              onClick={wrapMenuAction(handleRestore)}
            >
              <RefreshCcwDot size={14} />
              Restore
            </button>
          </li>
        )}
      </GenericMenu>
    );
  },
);

NodeItemMenu.displayName = "NodeItemMenu";
