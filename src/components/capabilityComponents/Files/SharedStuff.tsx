import {
  filesCapability,
  type SharedItem,
} from "#/capabilities/filesCapability";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { FileManager } from "#/components/FileManager/FileManager";
import { FilePreview } from "#/components/FileManager/FilePreview";
import type { FileManagerLocation } from "#/components/FileManager/types";
import { authClient } from "#/auth/authClient.ts";
import type { FileStorageNode } from "#/validators/storageNodeValidator.ts";
import { SharedItemListItem } from "./SharedItemListItem";
import { Share2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

export const SharedStuff = memo(() => {
  const filesCap = filesCapability.useMount();
  const { roomId } = useRoomInfoContext();
  const { sharedFolderOpenRequest } = useRoomUiNavigationContext();
  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user.id;
  const [folderView, setFolderView] = useState<{
    ownerUserId: string;
    rootFolderId: string;
    rootFolderName: string;
    location: FileManagerLocation;
  } | null>(null);
  const [previewFromList, setPreviewFromList] = useState<{
    ownerUserId: string;
    node: FileStorageNode;
  } | null>(null);

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
    if (item.node.kind === "folder") {
      setFolderView({
        ownerUserId: item.userId,
        rootFolderId: item.node.id,
        rootFolderName: item.node.name,
        location: {
          folderId: item.node.id,
          breadcrumbs: [{ id: item.node.id, name: item.node.name }],
          previewFileId: null,
          previewFileName: null,
        },
      });
    } else {
      setPreviewFromList({
        ownerUserId: item.userId,
        node: item.node,
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
      (share) => previewFromList.node.id === share.node.id,
    );
    if (sharedFile && sharedFile.node.name !== previewFromList.node.name) {
      setPreviewFromList({
        ...previewFromList,
        node: {
          ...previewFromList.node,
          name: sharedFile.node.name,
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
            key={item.node.id}
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
