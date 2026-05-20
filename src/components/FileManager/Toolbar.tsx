import { NewFolderDialog, type NewFolderDialogHandle } from "./NewFolderDialog";
import { useShareWithRoom } from "./useShareWithRoom";
import {
  ChevronDown,
  FolderPlus,
  FolderSymlink,
  Grid3X3,
  List,
  Menu,
  Unlink2,
  Upload,
} from "lucide-react";
import { memo, useId, useRef } from "react";

type CreatedFolder = {
  id: string;
  name: string;
};

type ViewMode = "list" | "grid";

const ViewModeDropdown = memo(
  ({
    viewMode,
    onViewModeChange,
  }: {
    viewMode: ViewMode;
    onViewModeChange: (viewMode: ViewMode) => void;
  }) => {
    const menuId = useId();
    const anchorName = `--file-view-${menuId.replaceAll(":", "")}`;
    const menuRef = useRef<HTMLDivElement>(null);
    const ViewIcon = viewMode === "list" ? List : Grid3X3;

    const handleViewModeChange = (nextViewMode: ViewMode) => {
      menuRef.current?.hidePopover();
      onViewModeChange(nextViewMode);
    };

    return (
      <>
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1"
          aria-haspopup="menu"
          aria-label="Change file view"
          popoverTarget={menuId}
          style={{ anchorName }}
        >
          <ViewIcon size={16} />
          {viewMode === "list" ? "List view" : "Grid view"}
          <ChevronDown size={14} />
        </button>
        <div
          id={menuId}
          ref={menuRef}
          popover="auto"
          className="dropdown dropdown-end rounded-box bg-base-100 ring-base-200
            w-40 shadow-lg ring-1"
          style={{ positionAnchor: anchorName }}
        >
          <ul className="menu p-1">
            <li>
              <button
                type="button"
                className={viewMode === "list" ? "active" : undefined}
                aria-pressed={viewMode === "list"}
                onClick={() => handleViewModeChange("list")}
              >
                <List size={16} />
                List view
              </button>
            </li>
            <li>
              <button
                type="button"
                className={viewMode === "grid" ? "active" : undefined}
                aria-pressed={viewMode === "grid"}
                onClick={() => handleViewModeChange("grid")}
              >
                <Grid3X3 size={16} />
                Grid view
              </button>
            </li>
          </ul>
        </div>
      </>
    );
  },
);

ViewModeDropdown.displayName = "ViewModeDropdown";

export const Toolbar = memo(
  ({
    currentFolderId,
    compact,
    onFolderCreated,
    onFilesSelected,
    viewMode,
    onViewModeChange,
    readOnly = false,
  }: {
    currentFolderId: string | null;
    compact: boolean;
    onFolderCreated: (folder: CreatedFolder) => void;
    onFilesSelected: (files: FileList) => void;
    viewMode: ViewMode;
    onViewModeChange: (viewMode: ViewMode) => void;
    readOnly?: boolean;
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const newFolderDialogRef = useRef<NewFolderDialogHandle>(null);
    const menuId = useId();
    const anchorName = `--file-toolbar-${menuId.replaceAll(":", "")}`;
    const menuRef = useRef<HTMLDivElement>(null);
    const {
      canShareWithRoom,
      shareWithRoom,
      canUnshareFromRoom,
      unshareFromRoom,
      isSharedWithRoom,
    } = useShareWithRoom(readOnly ? null : currentFolderId);

    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    const handleMenuAction = (action: () => void) => {
      menuRef.current?.hidePopover();
      action();
    };

    return (
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {compact ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="File actions"
              popoverTarget={menuId}
              style={{ anchorName }}
            >
              <Menu size={16} />
            </button>
            <div
              id={menuId}
              ref={menuRef}
              popover="auto"
              className="dropdown dropdown-end rounded-box bg-base-100
                ring-base-200 w-48 shadow-lg ring-1"
              style={{ positionAnchor: anchorName }}
            >
              <ul className="menu p-1">
                {!readOnly && (
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        handleMenuAction(() =>
                          newFolderDialogRef.current?.open(),
                        )
                      }
                    >
                      <FolderPlus size={16} />
                      New folder
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    className={viewMode === "list" ? "active" : undefined}
                    aria-pressed={viewMode === "list"}
                    onClick={() =>
                      handleMenuAction(() => onViewModeChange("list"))
                    }
                  >
                    <List size={16} />
                    List view
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={viewMode === "grid" ? "active" : undefined}
                    aria-pressed={viewMode === "grid"}
                    onClick={() =>
                      handleMenuAction(() => onViewModeChange("grid"))
                    }
                  >
                    <Grid3X3 size={16} />
                    Grid view
                  </button>
                </li>
                {!readOnly && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleMenuAction(handleUploadClick)}
                    >
                      <Upload size={16} />
                      Upload
                    </button>
                  </li>
                )}
                {canShareWithRoom && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleMenuAction(shareWithRoom)}
                    >
                      <FolderSymlink size={16} />
                      {isSharedWithRoom
                        ? "Reshare folder..."
                        : "Share folder with room"}
                    </button>
                  </li>
                )}
                {canUnshareFromRoom && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleMenuAction(unshareFromRoom)}
                    >
                      <Unlink2 size={16} />
                      Unshare folder
                    </button>
                  </li>
                )}
              </ul>
            </div>
            {!readOnly && (
              <NewFolderDialog
                ref={newFolderDialogRef}
                currentFolderId={currentFolderId}
                onCreated={onFolderCreated}
                showDefaultTrigger={false}
              />
            )}
          </>
        ) : (
          <>
            {!readOnly && (
              <NewFolderDialog
                ref={newFolderDialogRef}
                currentFolderId={currentFolderId}
                onCreated={onFolderCreated}
              />
            )}
            <ViewModeDropdown
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
            {!readOnly && (
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1"
                onClick={handleUploadClick}
              >
                <Upload size={16} />
                Upload
              </button>
            )}
          </>
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

Toolbar.displayName = "Toolbar";
