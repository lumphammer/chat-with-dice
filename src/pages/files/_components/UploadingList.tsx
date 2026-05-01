import type { UploadingFile } from "./useUpload";
import { AlertCircle, LoaderCircle, X } from "lucide-react";
import { memo } from "react";

export const UploadingList = memo(
  ({
    files,
    onDismiss,
  }: {
    files: UploadingFile[];
    onDismiss: (localId: string) => void;
  }) => {
    if (files.length === 0) return null;

    return (
      <ul className="flex flex-col gap-1">
        {files.map((file) => (
          <li
            key={file.localId}
            className="bg-base-200/50 flex items-center gap-3 rounded-lg px-3
              py-2"
          >
            {file.status === "uploading" && (
              <LoaderCircle size={16} className="text-primary animate-spin" />
            )}
            {file.status === "error" && (
              <AlertCircle size={16} className="text-error" />
            )}
            <span className="flex-1 truncate text-sm">
              {file.name}
              {file.status === "uploading" && (
                <span className="text-base-content/50 ml-2">Uploading…</span>
              )}
              {file.status === "error" && (
                <span className="text-error ml-2">{file.errorMessage}</span>
              )}
            </span>
            {file.status === "error" && (
              <button
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => onDismiss(file.localId)}
              >
                <X size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  },
);

UploadingList.displayName = "UploadingList";
