import { logger } from "#/utils/logger.ts";
import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import { useFeedback } from "../FeedbackContext";
import { GenericMenu, useGenericMenu } from "../GenericMenu";
import { DeckSettingsDialog } from "./DeckSettingsDialog";
import { HardDeleteDialog } from "./HardDeleteDialog";
import { buildFileUrl } from "./fileUrl";
import { useShareWithRoom } from "./useShareWithRoom";
import { actions } from "astro:actions";
import {
  Download,
  Layers,
  Pencil,
  Share2,
  Trash2,
  Unlink2,
  RefreshCcwDot,
} from "lucide-react";
import { memo } from "react";

export const NodeActionsMenu = memo(
  ({
    node,
    onAfterDelete,
    onRefresh,
    onStartRename,
    ownerUserId,
    readOnly,
    roomId,
  }: {
    node: StorageNode;
    onAfterDelete?: () => void;
    onRefresh?: () => void;
    onStartRename: () => void;
    ownerUserId?: string;
    readOnly: boolean;
    roomId?: string;
  }) => {
    const {
      canShareWithRoom,
      canUnshareFromRoom,
      shareWithRoom,
      unshareFromRoom,
      isSharedWithRoom,
    } = useShareWithRoom(node.id, readOnly);

    const { onError } = useFeedback();

    const handleDelete = async () => {
      const result = await actions.files.deleteNode({ nodeId: node.id });
      if (result.error) {
        logger.error("Failed to delete:", result.error);
        return;
      }
      onRefresh?.();
      onAfterDelete?.();
    };

    const handleRestore = async () => {
      const result = await actions.files.restoreNode({ nodeId: node.id });
      if (result.error) {
        onError(`Failed to restore ${node.name}: ${result.error.message}`);
        return;
      }
      onRefresh?.();
    };
    const handleToggleDeck = async () => {
      const result = await actions.files.setFolderIsDeck({
        nodeId: node.id,
        isDeck: node.kind === "folder" ? !node.isDeck : true,
      });
      if (result.error) {
        onError(`Failed to update ${node.name}: ${result.error.message}`);
        return;
      }
      onRefresh?.();
    };

    const isDeleted = node.deletedTime !== null;
    const isLive = !isDeleted;
    const downloadUrl =
      isLive && node.kind === "file"
        ? buildFileUrl(ownerUserId, node.id, { roomId })
        : null;

    const { genericMenu, wrapMenuAction, closeMenu } = useGenericMenu();

    const hasAnyAction =
      (isLive &&
        (canShareWithRoom || canUnshareFromRoom || !readOnly || downloadUrl)) ||
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
              {isSharedWithRoom
                ? `Reshare ${node.kind === "file" ? "file" : "folder"} in chat`
                : "Share with room"}
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
        {isLive && !readOnly && node.kind === "folder" && (
          <li>
            <button type="button" onClick={wrapMenuAction(handleToggleDeck)}>
              <Layers size={14} />
              {node.isDeck ? "Unmark as Deck" : "Mark as Deck"}
            </button>
          </li>
        )}
        {isLive && !readOnly && node.kind === "folder" && node.isDeck && (
          <li>
            <DeckSettingsDialog nodeId={node.id} name={node.name} />
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
        {downloadUrl && (
          <li>
            <a href={downloadUrl} download={node.name} onClick={closeMenu}>
              <Download size={14} />
              Download
            </a>
          </li>
        )}
        {isDeleted && !readOnly && (
          <li>
            <HardDeleteDialog
              name={node.name}
              nodeId={node.id}
              onAfterDelete={() => {
                onRefresh?.();
                onAfterDelete?.();
              }}
            />
          </li>
        )}
        {isDeleted && !readOnly && (
          <li>
            <button type="button" onClick={wrapMenuAction(handleRestore)}>
              <RefreshCcwDot size={14} />
              Restore
            </button>
          </li>
        )}
      </GenericMenu>
    );
  },
);

NodeActionsMenu.displayName = "NodeActionsMenu";
