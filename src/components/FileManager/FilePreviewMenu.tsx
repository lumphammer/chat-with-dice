import type { FilePreviewNode } from "./FilePreview";
import { GenericMenu, useGenericMenu } from "./GenericMenu";
import { useShareWithRoom } from "./useShareWithRoom";
import { actions } from "astro:actions";
import { Download, Pencil, Share2, Trash2, Unlink2 } from "lucide-react";
import { memo } from "react";

export const FilePreviewMenu = memo(
  ({
    downloadUrl,
    node,
    onAfterDelete,
    onRefresh,
    onStartRename,
    readOnly,
  }: {
    downloadUrl?: string;
    node: FilePreviewNode;
    onAfterDelete: () => void;
    onRefresh?: () => void;
    onStartRename: () => void;
    readOnly: boolean;
  }) => {
    const {
      canShareWithRoom,
      shareWithRoom,
      canUnshareFromRoom,
      unshareFromRoom,
      isSharedWithRoom,
    } = useShareWithRoom(readOnly ? null : node.id, readOnly);

    const handleDelete = async () => {
      const result = await actions.files.deleteNode({ nodeId: node.id });
      if (result.error) {
        console.error("Failed to delete:", result.error);
        return;
      }
      onRefresh?.();
      onAfterDelete?.();
    };

    const { genericMenu, wrapMenuAction, closeMenu } = useGenericMenu();

    return (
      <GenericMenu
        genericMenu={genericMenu}
        icon="vertical_kebab"
        label="Actions"
      >
        {canShareWithRoom && (
          <li>
            <button type="button" onClick={wrapMenuAction(shareWithRoom)}>
              <Share2 size={14} />
              {isSharedWithRoom ? "Reshare file..." : "Share file with room"}
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
        {!readOnly && (
          <li>
            <button type="button" onClick={wrapMenuAction(onStartRename)}>
              <Pencil size={14} />
              Rename
            </button>
          </li>
        )}
        {!readOnly && (
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
        <li>
          <a href={downloadUrl} download={node.name} onClick={closeMenu}>
            <Download size={14} />
            Download
          </a>
        </li>
      </GenericMenu>
    );
  },
);
