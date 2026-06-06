import { authClient } from "#/auth/authClient.ts";
import {
  filesCapability,
  sharedItemMessageDataValidator,
} from "#/capabilities/filesCapability";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { FilePreview } from "#/components/FileManager/FilePreview";
import { NodeIcon } from "#/components/FileManager/NodeIcon";
import { logger } from "#/utils/logger.ts";
import type { FileStorageNode } from "#/validators/storageNodeValidator.ts";
import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { Eye, FolderOpen } from "lucide-react";
import { memo, useMemo, useState } from "react";

export const SharedItemMessageDisplay = memo(
  ({ results }: { results?: JsonData; messageId: string }) => {
    const parsed = useMemo(
      () => sharedItemMessageDataValidator.safeParse(results),
      [results],
    );
    const filesCap = filesCapability.useMount();
    const { roomId } = useRoomInfoContext();
    const { openSharedFolder } = useRoomUiNavigationContext();
    const { data: sessionData } = authClient.useSession();
    const currentUserId = sessionData?.user.id;

    const [previewNode, setPreviewNode] = useState<FileStorageNode | null>(
      null,
    );

    const isAvailable = useMemo(() => {
      if (!parsed.success || !filesCap.initialised) return false;
      return filesCap.state.shares.some(
        (share) =>
          share.node.kind === parsed.data.node.kind &&
          share.node.id === parsed.data.node.id &&
          share.userId === parsed.data.userId,
      );
    }, [filesCap, parsed]);

    if (!parsed.success) {
      logger.error("Unable to parse message data", results, parsed.error);
      return null;
    }

    if (!isAvailable) {
      return <div className="text-sm italic">Shared file removed</div>;
    }

    const item = parsed.data;
    const node = item.node;
    const isFile = node.kind === "file";
    const metadata = `${isFile ? "File" : "Folder"} shared with room`;

    const handleOpen = () => {
      if (isFile) {
        setPreviewNode(node);
      } else {
        openSharedFolder({
          ownerUserId: item.userId,
          folderId: node.id,
          folderName: node.name,
        });
      }
    };

    return (
      <div className="flex min-w-0 flex-col gap-2 py-1">
        <button
          type="button"
          onClick={handleOpen}
          className="border-base-content/15 bg-base-100 hover:bg-base-200
            flex min-w-0 cursor-pointer items-center gap-3 rounded-md border
            p-2 text-left"
        >
          <span
            className="bg-base-200 flex size-10 shrink-0 items-center
              justify-center overflow-hidden rounded"
          >
            <NodeIcon
              node={node}
              ownerUserId={item.userId}
              roomId={roomId}
              size={20}
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{node.name}</span>
            <span className="text-base-content/50 truncate text-sm">
              {metadata}
            </span>
          </span>
          {isFile ? (
            <Eye size={16} className="text-base-content/50 shrink-0" />
          ) : (
            <FolderOpen size={16} className="text-base-content/50 shrink-0" />
          )}
        </button>
        {previewNode && (
          <FilePreview
            node={previewNode}
            onClose={() => setPreviewNode(null)}
            ownerUserId={item.userId}
            roomId={roomId}
            readOnly={item.userId !== currentUserId}
          />
        )}
      </div>
    );
  },
);

SharedItemMessageDisplay.displayName = "SharedItemMessageDisplay";
