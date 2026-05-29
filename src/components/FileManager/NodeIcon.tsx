import { FileTypeIcon } from "./FileTypeIcon";
import { buildFileUrl } from "./fileUrl";
import { Folder, FolderX, X, type LucideProps } from "lucide-react";
import { memo, type SVGProps } from "react";

export const NodeIcon = memo(
  ({
    contentType,
    hasThumbnail,
    isDeleted,
    isFolder,
    nodeId,
    ownerUserId,
    roomId,
    ...rest
  }: {
    contentType?: string;
    hasThumbnail: boolean;
    isDeleted: boolean;
    isFolder: boolean;
    nodeId: string;
    ownerUserId: string | undefined;
    roomId: string | undefined;
  } & SVGProps<SVGSVGElement> &
    LucideProps) => {
    // deleted items
    if (isDeleted) {
      if (isFolder) {
        return <FolderX {...rest} />;
      } else {
        return <X {...rest} />;
      }
    }

    // folders
    if (isFolder) {
      return <Folder {...rest} />;
    }

    // items with thumbnails
    if (hasThumbnail) {
      const thumbnailUrl = buildFileUrl(ownerUserId, nodeId, {
        roomId,
        suffix: "thumbnail",
      });
      return (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      );
    }

    // icons
    return (
      <FileTypeIcon
        contentType={contentType ?? "application/octet-stream"}
        {...rest}
      />
    );
  },
);
