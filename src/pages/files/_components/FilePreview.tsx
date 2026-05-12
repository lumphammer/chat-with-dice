import { ImagePreview } from "./ImagePreview";
import { PdfPreview } from "./PdfPreview";
import { fileTypeIcon } from "./fileTypeIcon";
import { formatBytes } from "./formatBytes";
import type { FileNode } from "./types";
import { Download, X } from "lucide-react";
import { memo, useEffect, useRef } from "react";

export const FilePreview = memo(
  ({ node, onClose }: { node: FileNode; onClose: () => void }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      dialog.showModal();
      dialog.addEventListener("close", onClose);
      return () => dialog.removeEventListener("close", onClose);
    }, [onClose]);

    if (!node.file) return null;

    const isImage = node.file.contentType.startsWith("image/");
    const isPdf = node.file.contentType === "application/pdf";
    const downloadUrl = `/api/files/${node.id}`;
    const Icon = fileTypeIcon(node.file.contentType);

    return (
      <dialog ref={dialogRef} closedby="any" className="modal">
        <div
          className="modal-box flex h-[95vh] w-[95vw] max-w-[95vw] flex-col
            gap-4 max-sm:h-full max-sm:w-full max-sm:max-w-full
            max-sm:rounded-none"
        >
          {/* Dialog Header*/}
          <div className="flex shrink-0 flex-row items-center justify-between">
            <h2 className="truncate text-lg font-bold">{node.name}</h2>
            <div className="flex flex-row items-center gap-2">
              <a
                href={downloadUrl}
                download={node.name}
                className="btn btn-ghost btn-sm gap-1"
              >
                <Download size={14} />
                Download
              </a>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => dialogRef.current?.close()}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {isImage ? (
            <ImagePreview src={downloadUrl} alt={node.name} />
          ) : isPdf ? (
            <PdfPreview src={downloadUrl} title={node.name} />
          ) : (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-4
                p-8"
            >
              <Icon
                size={64}
                strokeWidth={1}
                className="text-base-content/50"
              />
              <div className="text-center">
                <p className="font-medium">{node.name}</p>
                <p className="text-base-content/50 text-sm">
                  {node.file.contentType} &middot;{" "}
                  {formatBytes(node.file.sizeBytes)}
                </p>
              </div>
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    );
  },
);

FilePreview.displayName = "FilePreview";
