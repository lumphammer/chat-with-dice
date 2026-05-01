import { NewFolderDialog } from "./NewFolderDialog";
import { Upload } from "lucide-react";
import { memo, useRef } from "react";

export const Toolbar = memo(
  ({
    currentFolderId,
    onFolderCreated,
    onFilesSelected,
  }: {
    currentFolderId: string | null;
    onFolderCreated: () => void;
    onFilesSelected: (files: FileList) => void;
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
      <div className="flex items-center gap-2">
        <NewFolderDialog
          currentFolderId={currentFolderId}
          onCreated={onFolderCreated}
        />
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
