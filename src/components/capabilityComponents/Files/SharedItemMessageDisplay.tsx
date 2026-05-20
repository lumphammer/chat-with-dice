import {
  filesCapability,
  sharedItemMessageDataValidator,
  type SharedItemMessageData,
} from "#/capabilities/filesCapability";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { FilePreview } from "#/components/FileManager/FilePreview";
import type { FilePreviewNode } from "#/components/FileManager/FilePreview";
import { fileTypeIcon } from "#/components/FileManager/fileTypeIcon";
import { buildFileUrl } from "#/components/FileManager/fileUrl";
import { authClient } from "#/utils/auth-client";
import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { Folder, FolderOpen } from "lucide-react";
import { memo, useMemo, useState } from "react";

const getFilePreviewNode = (
  item: Extract<SharedItemMessageData, { kind: "file" }>,
): FilePreviewNode => ({
  id: item.nodeId,
  name: item.name,
  file: {
    contentType: item.contentType ?? "application/octet-stream",
    sizeBytes: item.sizeBytes,
  },
});

export const SharedItemMessageDisplay = memo(
  ({ results }: { results?: JsonData; messageId: string }) => {
    const parsed = sharedItemMessageDataValidator.safeParse(results);
    const filesCap = filesCapability.useMount();
    const { roomId } = useRoomInfoContext();
    const { openSharedFolder } = useRoomUiNavigationContext();
    const { data: sessionData } = authClient.useSession();
    const currentUserId = sessionData?.user.id;
    const [previewNode, setPreviewNode] = useState<FilePreviewNode | null>(
      null,
    );

    const isAvailable = useMemo(() => {
      if (!parsed.success || !filesCap.initialised) return false;
      return filesCap.state.shares.some(
        (share) =>
          share.kind === parsed.data.kind &&
          share.nodeId === parsed.data.nodeId &&
          share.userId === parsed.data.userId,
      );
    }, [filesCap, parsed]);

    if (!parsed.success) return null;

    const item = parsed.data;
    const isFile = item.kind === "file";
    const contentType = isFile
      ? (item.contentType ?? "application/octet-stream")
      : "application/octet-stream";
    const Icon = isFile ? fileTypeIcon(contentType) : Folder;
    const thumbnailUrl =
      isFile && item.thumbnailR2Key
        ? buildFileUrl(item.userId, item.nodeId, {
            roomId,
            suffix: "thumbnail",
          })
        : null;
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
                className={isFile ? "text-base-content/70" : "text-warning"}
              />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{item.name}</span>
            <span className="text-base-content/50 truncate text-sm">
              {metadata}
            </span>
          </span>
          {isFile ? (
            <button
              type="button"
              className="btn btn-primary btn-xs shrink-0"
              disabled={!isAvailable}
              onClick={() => setPreviewNode(getFilePreviewNode(item))}
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
                  folderId: item.nodeId,
                  folderName: item.name,
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
