import {
  filesCapability,
  type SharedItem,
} from "#/capabilities/filesCapability";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { FileManager } from "#/components/FileManager/FileManager";
import {
  FilePreview,
  type FilePreviewNode,
} from "#/components/FileManager/FilePreview";
import type { FileManagerLocation } from "#/components/FileManager/types";
import { authClient } from "#/utils/auth-client";
import { SharedItemListItem } from "./SharedItemListItem";
import { Share2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

type SharedFolderView = {
  ownerUserId: string;
  rootFolderId: string;
  rootFolderName: string;
  location: FileManagerLocation;
};

type PreviewState = {
  ownerUserId: string;
  node: FilePreviewNode;
};

const buildSharedFileNode = (
  item: Extract<SharedItem, { kind: "file" }>,
): FilePreviewNode => ({
  id: item.nodeId,
  name: item.name,
  file: {
    sizeBytes: item.sizeBytes,
    contentType: item.contentType ?? "application/octet-stream",
  },
});

export const SharedStuff = memo(() => {
  const filesCap = filesCapability.useMount();
  const { roomId } = useRoomInfoContext();
  const { sharedFolderOpenRequest } = useRoomUiNavigationContext();
  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user.id;
  const [folderView, setFolderView] = useState<SharedFolderView | null>(null);
  const [previewFromList, setPreviewFromList] = useState<PreviewState | null>(
    null,
  );

  useEffect(() => {
    if (!sharedFolderOpenRequest) return;

    setPreviewFromList(null);
    setFolderView({
      ownerUserId: sharedFolderOpenRequest.ownerUserId,
      rootFolderId: sharedFolderOpenRequest.folderId,
      rootFolderName: sharedFolderOpenRequest.folderName,
      location: {
        folderId: sharedFolderOpenRequest.folderId,
        breadcrumbs: [
          {
            id: sharedFolderOpenRequest.folderId,
            name: sharedFolderOpenRequest.folderName,
          },
        ],
        previewFileId: null,
        previewFileName: null,
      },
    });
  }, [sharedFolderOpenRequest]);

  const handleSelect = useCallback((item: SharedItem) => {
    if (item.kind === "folder") {
      setFolderView({
        ownerUserId: item.userId,
        rootFolderId: item.nodeId,
        rootFolderName: item.name,
        location: {
          folderId: item.nodeId,
          breadcrumbs: [{ id: item.nodeId, name: item.name }],
          previewFileId: null,
          previewFileName: null,
        },
      });
    } else {
      setPreviewFromList({
        ownerUserId: item.userId,
        node: buildSharedFileNode(item),
      });
    }
  }, []);

  const handleFolderLocationChange = useCallback(
    (next: FileManagerLocation) => {
      // navigating to root (Home) inside the read-only view pops back to the
      // shared-items list — there is no "root" outside the shared subtree
      if (next.folderId === null) {
        setFolderView(null);
        return;
      }
      setFolderView((prev) => (prev ? { ...prev, location: next } : prev));
    },
    [],
  );

  const sortedShares = useMemo(() => {
    if (!filesCap.initialised) return [];
    return [...filesCap.state.shares].sort(
      (a, b) => b.dateShared - a.dateShared,
    );
  }, [filesCap]);

  useEffect(() => {
    if (!filesCap.initialised || !previewFromList) return;
    const sharedFile = filesCap.state.shares.find(
      (share) => previewFromList.node.id === share.nodeId,
    );
    if (sharedFile) {
      setPreviewFromList({
        ...previewFromList,
        node: {
          ...previewFromList.node,
          name: sharedFile.name,
        },
      });
    }
  }, [filesCap, previewFromList]);

  if (!filesCap.initialised) {
    return (
      <div className="animate-fadein-slow flex flex-col gap-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (folderView) {
    const isOwner = folderView.ownerUserId === currentUserId;
    return (
      <div className="animate-fadein p-4">
        <FileManager
          location={folderView.location}
          onLocationChange={handleFolderLocationChange}
          {...(isOwner
            ? { ownerUserId: undefined, roomId: undefined }
            : { ownerUserId: folderView.ownerUserId, roomId })}
          rootIcon={Share2}
          rootLabel="Shared"
        />
      </div>
    );
  }

  if (sortedShares.length === 0) {
    return (
      <div
        className="text-base-content/50 flex min-h-32 items-center px-4 text-sm"
      >
        Nothing has been shared with this room yet.
      </div>
    );
  }

  return (
    <>
      <ul className="animate-fadein flex min-w-0 flex-col gap-1">
        {sortedShares.map((item) => (
          <SharedItemListItem
            key={item.nodeId}
            item={item}
            roomId={roomId}
            onSelect={handleSelect}
          />
        ))}
      </ul>
      {previewFromList && (
        <FilePreview
          node={previewFromList.node}
          onClose={() => setPreviewFromList(null)}
          ownerUserId={previewFromList.ownerUserId}
          roomId={roomId}
          readOnly={previewFromList.ownerUserId !== currentUserId}
        />
      )}
    </>
  );
});

SharedStuff.displayName = "SharedStuff";
