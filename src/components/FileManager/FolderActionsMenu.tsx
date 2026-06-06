import { formatBytes } from "#/utils/formatBytes";
import { GenericMenu, useGenericMenu } from "./GenericMenu";
import { QuotaBar } from "./QuotaBar";
import type { ViewMode } from "./viewModeStore";
import {
  FolderPlus,
  FolderSymlink,
  Grid3X3,
  HardDrive,
  List,
  Unlink2,
  Upload,
  RefreshCw,
  Trash,
} from "lucide-react";
import { memo } from "react";

export const FolderActionsMenu = memo(
  ({
    canShareWithRoom,
    canUnshareFromRoom,
    includePrimaryActions,
    isSharedWithRoom,
    onNewFolder,
    onRefresh,
    onShareWithRoom,
    onUnshareFromRoom,
    onUpload,
    onViewModeChange,
    readOnly,
    storageQuotaBytes,
    storageUsedBytes,
    viewMode,
    showDeleted,
    onShowDeletedChange,
  }: {
    canShareWithRoom: boolean;
    canUnshareFromRoom: boolean;
    includePrimaryActions: boolean;
    isSharedWithRoom: boolean;
    onNewFolder: () => void;
    onRefresh: () => void;
    onShareWithRoom: () => void;
    onUnshareFromRoom: () => void;
    onUpload: () => void;
    onViewModeChange: (viewMode: ViewMode) => void;
    readOnly: boolean;
    storageQuotaBytes: number;
    storageUsedBytes: number;
    viewMode: ViewMode;
    showDeleted: boolean;
    onShowDeletedChange: (showDeleted: boolean) => void;
  }) => {
    const { genericMenu, wrapMenuAction } = useGenericMenu();

    return (
      <GenericMenu
        genericMenu={genericMenu}
        label="Folder actions"
        icon="hamburger"
      >
        {includePrimaryActions && (
          <>
            <li>
              <button type="button" onClick={wrapMenuAction(onNewFolder)}>
                <FolderPlus size={16} />
                Add folder
              </button>
            </li>
            <li>
              <button type="button" onClick={wrapMenuAction(onUpload)}>
                <Upload size={16} />
                Upload
              </button>
            </li>
          </>
        )}
        <li>
          <button
            type="button"
            aria-pressed={viewMode === "list"}
            onClick={wrapMenuAction(onRefresh)}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </li>
        {viewMode === "list" && (
          <li>
            <button
              type="button"
              onClick={wrapMenuAction(() => onViewModeChange("grid"))}
            >
              <Grid3X3 size={16} />
              Use grid view
            </button>
          </li>
        )}
        {viewMode === "grid" && (
          <li>
            <button
              type="button"
              onClick={wrapMenuAction(() => onViewModeChange("list"))}
            >
              <List size={16} />
              Use list view
            </button>
          </li>
        )}
        {canShareWithRoom && (
          <li>
            <button type="button" onClick={wrapMenuAction(onShareWithRoom)}>
              <FolderSymlink size={16} />
              {isSharedWithRoom
                ? "Reshare folder in chat"
                : "Share folder with room"}
            </button>
          </li>
        )}
        {canUnshareFromRoom && (
          <li>
            <button type="button" onClick={wrapMenuAction(onUnshareFromRoom)}>
              <Unlink2 size={16} />
              Unshare folder
            </button>
          </li>
        )}
        {!readOnly && (
          <li>
            <button
              type="button"
              onClick={wrapMenuAction(() => onShowDeletedChange(!showDeleted))}
            >
              <Trash size={16} />
              {showDeleted ? "Hide" : "Show"} deleted items
            </button>
          </li>
        )}
        <li>
          <div
            className="text-base-content/70 pointer-events-none flex flex-col
              items-stretch gap-1.5 px-3 py-2"
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
      </GenericMenu>
    );
  },
);

FolderActionsMenu.displayName = "FolderActionsMenu";
