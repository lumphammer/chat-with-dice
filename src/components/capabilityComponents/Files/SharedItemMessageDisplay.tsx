import { authClient } from "#/auth/authClient.ts";
import { filesClient } from "#/capabilities/files/client";
import { sharedItemMessageDataValidator } from "#/capabilities/files/common";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { FilePreview } from "#/components/FileManager/FilePreview";
import { NodeIcon } from "#/components/FileManager/NodeIcon";
import { logger } from "#/utils/logger.ts";
import type { JsonData } from "#/validators/jsonObjectValidator.ts";
import type { FileStorageNode } from "#/validators/storageNodeValidator.ts";
import { memo, useMemo, useState } from "react";

export const SharedItemMessageDisplay = memo(
  ({ capabilityData }: { capabilityData?: JsonData; messageId: string }) => {
    const parsed = useMemo(
      () => sharedItemMessageDataValidator.safeParse(capabilityData),
      [capabilityData],
    );
    const filesCap = filesClient.useMount();
    const { roomId } = useRoomInfoContext();
    const { openSharedFolder } = useRoomUiNavigationContext();
    const { data: sessionData } = authClient.useSession();
    const currentUserId = sessionData?.user.id;

    const [previewNode, setPreviewNode] = useState<FileStorageNode | null>(
      null,
    );

    // Viewable, rather than merely granted: unsharing drops the share from the
    // room's list, while binning the file keeps the grant and marks it
    // unavailable. Either way there is nothing here to open, and a restore
    // makes the message live again.
    const isAvailable = useMemo(() => {
      if (!parsed.success || !filesCap.initialised) return false;
      return filesCap.state.shares.some(
        (share) =>
          !share.unavailable &&
          share.node.kind === parsed.data.node.kind &&
          share.node.id === parsed.data.node.id &&
          share.userId === parsed.data.userId,
      );
    }, [filesCap, parsed]);

    if (!parsed.success) {
      logger.error(
        "Unable to parse message data",
        capabilityData,
        parsed.error,
      );
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
      <>
        <button
          type="button"
          onClick={handleOpen}
          className="btn btn-primary m-1 box-content flex h-auto max-w-full
            flex-row gap-4 py-1 pr-2 pl-1"
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center
              overflow-hidden"
          >
            <NodeIcon
              node={node}
              ownerUserId={item.userId}
              roomId={roomId}
              size={20}
            />
          </div>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium wrap-anywhere">{node.name}</span>
            <span className="text-base-content/50 truncate text-sm">
              {metadata}
            </span>
          </span>
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
      </>
    );
  },
);

SharedItemMessageDisplay.displayName = "SharedItemMessageDisplay";
