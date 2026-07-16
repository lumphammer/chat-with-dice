import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import { FileTypeIcon } from "./FileTypeIcon";
import { buildFileUrl } from "./fileUrl";
import {
  Folder,
  FolderX,
  Layers,
  Trash2,
  type LucideProps,
} from "lucide-react";
import { memo, type SVGProps } from "react";

const Thumbnail = ({
  ownerUserId,
  nodeId,
  roomId,
  className,
}: {
  ownerUserId: string | undefined;
  nodeId: string;
  roomId: string | undefined;
  className?: string;
}) => {
  const thumbnailUrl = buildFileUrl(ownerUserId, nodeId, {
    roomId,
    suffix: "thumbnail",
  });

  return (
    <img
      src={thumbnailUrl}
      alt=""
      loading="lazy"
      className={`h-full w-full object-cover ${className}`}
    />
  );
};

export const NodeIcon = memo(
  ({
    node,
    ownerUserId,
    roomId,
    ...rest
  }: {
    node: StorageNode;
    ownerUserId: string | undefined;
    roomId: string | undefined;
  } & SVGProps<SVGSVGElement> &
    LucideProps) => {
    // deleted items
    if (node.deletedTime) {
      if (node.kind === "folder") {
        return <FolderX {...rest} />;
      } else if (node.thumbnailContentType) {
        return (
          <div className="relative aspect-square">
            <Thumbnail
              className="opacity-70"
              ownerUserId={ownerUserId}
              nodeId={node.id}
              roomId={roomId}
            />
            <div
              className="bg-base-200 text-error-text absolute inset-2 flex
                items-center justify-center rounded-full p-1
                group-data-grid:inset-8 group-data-grid:p-3"
            >
              <Trash2 {...rest} className={`${rest.className ?? ""} `} />
            </div>
          </div>
        );
      } else {
        return <Trash2 {...rest} />;
      }
    }

    // items with thumbnails
    if (node.kind === "file" && node.thumbnailContentType) {
      return (
        <Thumbnail ownerUserId={ownerUserId} nodeId={node.id} roomId={roomId} />
      );
    }
    // folders
    if (node.kind === "folder") {
      return node.isDeck ? <Layers {...rest} /> : <Folder {...rest} />;
    }

    // icons
    return (
      <FileTypeIcon
        contentType={node.contentType ?? "application/octet-stream"}
        {...rest}
      />
    );
  },
);
