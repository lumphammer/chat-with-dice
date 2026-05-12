import { NewFolderDialog } from "./NewFolderDialog";
import { Grid3X3, List, Upload } from "lucide-react";
import { memo, useRef } from "react";

export const Toolbar = memo(
  ({
    currentFolderId,
    onFolderCreated,
    onFilesSelected,
    viewMode,
    onViewModeChange,
  }: {
    currentFolderId: string | null;
    onFolderCreated: () => void;
    onFilesSelected: (files: FileList) => void;
    viewMode: "list" | "grid";
    onViewModeChange: (viewMode: "list" | "grid") => void;
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
      <div className="ml-auto flex items-center gap-2">
        <NewFolderDialog
          currentFolderId={currentFolderId}
          onCreated={onFolderCreated}
        />
        <div className="join">
          <button
            type="button"
            className={`btn btn-sm join-item
              ${viewMode === "list" ? "btn-active" : "btn-ghost"}`}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item
              ${viewMode === "grid" ? "btn-active" : "btn-ghost"}`}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
          >
            <Grid3X3 size={16} />
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm gap-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
          Upload
        </button>
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
      </div>
    );
  },
);

Toolbar.displayName = "Toolbar";
