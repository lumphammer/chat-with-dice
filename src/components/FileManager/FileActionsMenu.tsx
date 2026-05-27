import { formatBytes } from "#/utils/formatBytes";
import { QuotaBar } from "./QuotaBar";
import type { ViewMode } from "./viewModeStore";
import {
  FolderPlus,
  FolderSymlink,
  Grid3X3,
  HardDrive,
  List,
  Menu,
  Unlink2,
  Upload,
  RefreshCw,
  // Trash,
} from "lucide-react";
import { memo, useId, useRef } from "react";

export const FileActionsMenu = memo(
  ({
    canShareWithRoom,
    canUnshareFromRoom,
    includePrimaryActions,
    isSharedWithRoom,
    onNewFolder,
    onRefresh,
    onShareWithRoom,
    // onShowDeletedItems,
    onUnshareFromRoom,
    onUpload,
    onViewModeChange,
    // readOnly,
    storageQuotaBytes,
    storageUsedBytes,
    viewMode,
  }: {
    canShareWithRoom: boolean;
    canUnshareFromRoom: boolean;
    includePrimaryActions: boolean;
    isSharedWithRoom: boolean;
    onNewFolder: () => void;
    onRefresh: () => void;
    onShareWithRoom: () => void;
    // onShowDeletedItems: () => void;
    onUnshareFromRoom: () => void;
    onUpload: () => void;
    onViewModeChange: (viewMode: ViewMode) => void;
    // readOnly: boolean;
    storageQuotaBytes: number;
    storageUsedBytes: number;
    viewMode: ViewMode;
  }) => {
    const menuId = useId();
    const anchorName = `--file-toolbar-${menuId.replaceAll(":", "")}`;
    const menuRef = useRef<HTMLDivElement>(null);

    const handleMenuAction = (action: () => void) => {
      menuRef.current?.hidePopover();
      action();
    };

    return (
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
          className="dropdown dropdown-end rounded-box bg-base-100 ring-base-200
            w-48 shadow-lg ring-1"
          style={{ positionAnchor: anchorName }}
        >
          <ul className="menu p-1">
            {includePrimaryActions && (
              <>
                <li>
                  <button
                    type="button"
                    onClick={() => handleMenuAction(onNewFolder)}
                  >
                    <FolderPlus size={16} />
                    New folder
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleMenuAction(onUpload)}
                  >
                    <Upload size={16} />
                    Upload
                  </button>
                </li>
              </>
            )}
            <li>
              <button
                type="button"
                className={viewMode === "list" ? "active" : undefined}
                aria-pressed={viewMode === "list"}
                onClick={() => handleMenuAction(() => onRefresh())}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </li>
            <li>
              <button
                type="button"
                className={viewMode === "list" ? "active" : undefined}
                aria-pressed={viewMode === "list"}
                onClick={() => handleMenuAction(() => onViewModeChange("list"))}
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
                onClick={() => handleMenuAction(() => onViewModeChange("grid"))}
              >
                <Grid3X3 size={16} />
                Grid view
              </button>
            </li>
            {canShareWithRoom && (
              <li>
                <button
                  type="button"
                  onClick={() => handleMenuAction(onShareWithRoom)}
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
                  onClick={() => handleMenuAction(onUnshareFromRoom)}
                >
                  <Unlink2 size={16} />
                  Unshare folder
                </button>
              </li>
            )}
            {/*{!readOnly && (
              <li>
                <button
                  type="button"
                  onClick={() => handleMenuAction(onShowDeletedItems)}
                >
                  <Trash size={16} />
                  Show deleted items
                </button>
              </li>
            )}*/}
            <li>
              <div
                className="text-base-content/70 pointer-events-none flex
                  flex-col items-stretch gap-1.5 px-3 py-2"
                role="presentation"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <HardDrive size={16} className="shrink-0" />
                  <span className="sr-only">Storage used: </span>
                  <span className="min-w-0 truncate">
                    {formatBytes(storageUsedBytes)} /{" "}
                    {formatBytes(storageQuotaBytes)}
                  </span>
                </span>
                <QuotaBar
                  usedBytes={storageUsedBytes}
                  quotaBytes={storageQuotaBytes}
                />
              </div>
            </li>
          </ul>
        </div>
      </>
    );
  },
);

FileActionsMenu.displayName = "FileActionsMenu";
