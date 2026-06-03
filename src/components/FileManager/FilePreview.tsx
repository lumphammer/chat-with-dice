import { formatBytes } from "#/utils/formatBytes";
import { FilePreviewMenu } from "./FilePreviewMenu";
import { FileTypeIcon } from "./FileTypeIcon";
import { ImagePreview } from "./ImagePreview";
import { PdfPreview } from "./PdfPreview";
import { TextPreview } from "./TextPreview";
import { buildFileUrl } from "./fileUrl";
import { isTextPreviewable } from "./textPreviewTypes";
import type { FilePreviewNode } from "./types";
import { useRename } from "./useRename";
import { X } from "lucide-react";
import { memo, useCallback, useEffect, useRef } from "react";

export const FilePreview = memo(
  ({
    node,
    onClose,
    onRefresh,
    onRenamed,
    ownerUserId,
    roomId,
    readOnly = false,
  }: {
    node: FilePreviewNode;
    onClose: () => void;
    onRefresh?: () => void;
    onRenamed?: (nodeId: string, newName: string) => void;
    ownerUserId?: string;
    roomId?: string;
    readOnly?: boolean;
  }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    const {
      handleStartRename,
      handleCommitRename,
      handleRenameKeyDown,
      isRenaming,
      inputRef,
      renameValue,
      setRenameValue,
      renameError,
    } = useRename({
      node,
      onClick: () => {},
      onRenamed: onRenamed ?? (() => {}),
    });

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      dialog.showModal();
      dialog.addEventListener("close", onClose);
      return () => dialog.removeEventListener("close", onClose);
    }, [onClose]);

    const handleAfterDete = useCallback(() => {
      dialogRef.current?.close();
    }, []);

    if (!node.file) return null;

    const isImage = node.file.contentType.startsWith("image/");
    const isAudio = node.file.contentType.startsWith("audio/");
    const isVideo = node.file.contentType.startsWith("video/");
    const isPdf = node.file.contentType === "application/pdf";
    const isText = isTextPreviewable(node.name, node.file.contentType);

    const downloadUrl = buildFileUrl(ownerUserId, node.id, { roomId });

    return (
      <dialog ref={dialogRef} closedby="any" className="modal">
        <div
          className="modal-box flex h-[95vh] w-[95vw] max-w-[95vw] flex-col
            gap-4 max-sm:h-full max-sm:w-full max-sm:max-w-full
            max-sm:rounded-none"
        >
          {/* Dialog Header*/}
          <div className="flex shrink-0 flex-row items-center justify-between">
            {isRenaming ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  ref={inputRef}
                  className="input input-sm input-bordered w-full"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.currentTarget.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={() => void handleCommitRename()}
                />
                {renameError && (
                  <span className="text-error text-xs">{renameError}</span>
                )}
              </div>
            ) : (
              <>
                <h2 className="truncate text-lg font-bold">{node.name}</h2>
                <div className="flex-1" />
              </>
            )}
            <FilePreviewMenu
              node={node}
              onAfterDelete={handleAfterDete}
              onStartRename={handleStartRename}
              readOnly={readOnly}
              onRefresh={onRefresh}
              downloadUrl={downloadUrl}
            />
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={18} />
            </button>
          </div>

          {isImage ? (
            <ImagePreview src={downloadUrl} alt={node.name} />
          ) : isPdf ? (
            <PdfPreview src={downloadUrl} title={node.name} />
          ) : isText ? (
            <TextPreview
              contentType={node.file.contentType}
              filename={node.name}
              sizeBytes={node.file.sizeBytes}
              src={downloadUrl}
            />
          ) : isAudio ? (
            <div
              className="bg-base-200 flex min-h-0 flex-1 flex-col items-center
                justify-center gap-6 rounded p-8"
            >
              <FileTypeIcon
                contentType={node.file.contentType}
                size={64}
                strokeWidth={1}
                className="text-base-content/50"
              />

              {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                controls
                preload="metadata"
                src={downloadUrl}
                className="w-full max-w-xl"
              >
                <a href={downloadUrl} download={node.name}>
                  Download audio
                </a>
              </audio>
            </div>
          ) : isVideo ? (
            // oxlint-disable-next-line jsx-a11y/media-has-caption
            <video
              controls
              preload="metadata"
              src={downloadUrl}
              className="bg-base-200 min-h-0 flex-1 rounded object-contain"
            >
              <a href={downloadUrl} download={node.name}>
                Download video
              </a>
            </video>
          ) : (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-4
                p-8"
            >
              <FileTypeIcon
                contentType={node.file.contentType}
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
