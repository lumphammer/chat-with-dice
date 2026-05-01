import { fileTypeIcon } from "./fileTypeIcon";
import { formatBytes } from "./formatBytes";
import type { FileNode } from "./types";
import { Download, X } from "lucide-react";
import { memo } from "react";

export const FilePreview = memo(
  ({ node, onClose }: { node: FileNode; onClose: () => void }) => {
    if (!node.file) return null;

    const isImage = node.file.content_type.startsWith("image/");
    const downloadUrl = `/api/files/${node.id}`;
    const Icon = fileTypeIcon(node.file.content_type);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="truncate text-lg font-bold">{node.name}</h2>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isImage ? (
          <div className="bg-base-200 flex justify-center rounded-lg p-4">
            <img
              src={downloadUrl}
              alt={node.name}
              className="max-h-[70vh] max-w-full rounded object-contain"
            />
          </div>
        ) : (
          <div
            className="bg-base-200 flex flex-col items-center gap-4 rounded-lg
              p-8"
          >
            <Icon size={64} strokeWidth={1} className="text-base-content/50" />
            <div className="text-center">
              <p className="font-medium">{node.name}</p>
              <p className="text-base-content/50 text-sm">
                {node.file.content_type} &middot;{" "}
                {formatBytes(node.file.size_bytes)}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <a
            href={downloadUrl}
            download={node.name}
            className="btn btn-sm gap-1"
          >
            <Download size={14} />
            Download
          </a>
        </div>
      </div>
    );
  },
);

FilePreview.displayName = "FilePreview";
