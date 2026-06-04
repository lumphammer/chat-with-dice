import { formatBytes } from "#/utils/formatBytes";
import type { FileStorageNode } from "#/validators/storageNodeValidator.ts";
import { FileTypeIcon } from "./FileTypeIcon";
import { ImagePreview } from "./ImagePreview";
import { NodeActionsMenu } from "./NodeActionsMenu";
import { PdfPreview } from "./PdfPreview";
import { TextPreview } from "./TextPreview";
import { buildFileUrl } from "./fileUrl";
import { isTextPreviewable } from "./textPreviewTypes";
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
    node: FileStorageNode;
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

    const handleAfterDelete = useCallback(() => {
      dialogRef.current?.close();
    }, []);

    const isImage = node.contentType.startsWith("image/");
    const isAudio = node.contentType.startsWith("audio/");
    const isVideo = node.contentType.startsWith("video/");
    const isPdf = node.contentType === "application/pdf";
    const isText = isTextPreviewable(node.name, node.contentType);

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
            <NodeActionsMenu
              node={node}
              onAfterDelete={handleAfterDelete}
              onStartRename={handleStartRename}
              readOnly={readOnly}
              onRefresh={onRefresh}
              ownerUserId={ownerUserId}
              roomId={roomId}
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
              contentType={node.contentType}
              filename={node.name}
              sizeBytes={node.sizeBytes}
              src={downloadUrl}
            />
          ) : isAudio ? (
            <div
              className="bg-base-200 flex min-h-0 flex-1 flex-col items-center
                justify-center gap-6 rounded p-8"
            >
              <FileTypeIcon
                contentType={node.contentType}
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
                contentType={node.contentType}
                size={64}
                strokeWidth={1}
                className="text-base-content/50"
              />

              <div className="text-center">
                <p className="font-medium">{node.name}</p>
                <p className="text-base-content/50 text-sm">
                  {node.contentType} &middot; {formatBytes(node.sizeBytes)}
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
