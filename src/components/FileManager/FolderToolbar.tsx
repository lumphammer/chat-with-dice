import { authClient } from "#/auth/authClient.ts";
import { FolderActionsMenu } from "./FolderActionsMenu";
import { NewFolderDialog, type NewFolderDialogHandle } from "./NewFolderDialog";
import { useShareWithRoom } from "./useShareWithRoom";
import type { ViewMode } from "./viewModeStore";
import { FolderPlus, Upload } from "lucide-react";
import { memo, useRef } from "react";

type CreatedFolder = {
  id: string;
  name: string;
};

export const FolderToolbar = memo(
  ({
    currentFolderId,
    compact,
    onFolderCreated,
    onFilesSelected,
    viewMode,
    onViewModeChange,
    readOnly = false,
    onRefresh,
    showDeleted,
    onShowDeletedChange,
  }: {
    currentFolderId: string | null;
    compact: boolean;
    onFolderCreated: (folder: CreatedFolder) => void;
    onFilesSelected: (files: FileList) => void;
    viewMode: ViewMode;
    onViewModeChange: (viewMode: ViewMode) => void;
    readOnly?: boolean;
    onRefresh: () => void;
    showDeleted: boolean;
    onShowDeletedChange: (showDeleted: boolean) => void;
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const newFolderDialogRef = useRef<NewFolderDialogHandle>(null);
    const session = authClient.useSession();
    const storageQuotaBytes = session.data?.user.storageQuotaBytes ?? 0;
    const storageUsedBytes = session.data?.user.storageUsedBytes ?? 0;
    const {
      canShareWithRoom,
      shareWithRoom,
      canUnshareFromRoom,
      unshareFromRoom,
      isSharedWithRoom,
    } = useShareWithRoom(readOnly ? null : currentFolderId, readOnly);

    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    const handleNewFolderClick = () => {
      newFolderDialogRef.current?.open();
    };

    return (
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {!compact && !readOnly && (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              aria-label="New folder"
              onClick={handleNewFolderClick}
            >
              <FolderPlus size={16} />
              New folder
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={handleUploadClick}
            >
              <Upload size={16} />
              Upload
            </button>
          </>
        )}
        <FolderActionsMenu
          canShareWithRoom={canShareWithRoom}
          canUnshareFromRoom={canUnshareFromRoom}
          includePrimaryActions={compact && !readOnly}
          isSharedWithRoom={isSharedWithRoom}
          onNewFolder={handleNewFolderClick}
          onShareWithRoom={shareWithRoom}
          onUnshareFromRoom={unshareFromRoom}
          onUpload={handleUploadClick}
          onViewModeChange={onViewModeChange}
          onRefresh={onRefresh}
          readOnly={readOnly}
          storageQuotaBytes={storageQuotaBytes}
          storageUsedBytes={storageUsedBytes}
          viewMode={viewMode}
          showDeleted={showDeleted}
          onShowDeletedChange={onShowDeletedChange}
        />
        {!readOnly && (
          <NewFolderDialog
            ref={newFolderDialogRef}
            currentFolderId={currentFolderId}
            onCreated={onFolderCreated}
            showDefaultTrigger={false}
          />
        )}
        {!readOnly && (
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => {
              const files = e.currentTarget.files;
              if (files && files.length > 0) {
                onFilesSelected(files);
              }
              // reset so the same file can be re-selected
              e.currentTarget.value = "";
            }}
          />
        )}
      </div>
    );
  },
);

FolderToolbar.displayName = "Toolbar";
