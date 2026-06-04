import {
  filesCapability,
  sharedItemMessageDataValidator,
} from "#/capabilities/filesCapability";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { FilePreview } from "#/components/FileManager/FilePreview";
import { NodeIcon } from "#/components/FileManager/NodeIcon";
import { authClient } from "#/utils/auth-client";
import type { FileStorageNode } from "#/validators/storageNodeValidator.ts";
import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { FolderOpen } from "lucide-react";
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
      console.error("Unable to parse message data", results, parsed.error);
      return null;
    }

    const item = parsed.data;
    const node = item.node;
    const isFile = item.node.kind === "file";
    const metadata = isAvailable
      ? `${isFile ? "File" : "Folder"} shared with room`
      : "No longer available";

    if (!isAvailable) {
      return <div className="text-sm italic">Shared file removed</div>;
    }

    return (
      <div className="flex min-w-0 flex-col gap-2 py-1">
        <div
          className="border-base-content/15 bg-base-100 flex min-w-0
            items-center gap-3 rounded-md border p-2 text-left"
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
          {node.kind === "file" ? (
            <button
              type="button"
              className="btn btn-primary btn-xs shrink-0"
              disabled={!isAvailable}
              onClick={() => setPreviewNode(node)}
            >
              Preview
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-xs shrink-0 gap-1"
              disabled={!isAvailable}
              onClick={() =>
                openSharedFolder({
                  ownerUserId: item.userId,
                  folderId: item.node.id,
                  folderName: item.node.name,
                })
              }
            >
              <FolderOpen size={14} />
              Open
            </button>
          )}
        </div>
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
