import { buildFileUrl } from "./fileUrl";
import { memo, useState } from "react";

/**
 * A small square thumbnail of one of the owner's own Deck images. Because it is
 * the owner's own file it needs no owner segment or room id; it hides the image
 * (leaving the empty frame) if the thumbnail fails to load. Shared by the Common
 * Back picker and the Individual Backs editor.
 */
export const DeckImageThumbnail = memo(({ nodeId }: { nodeId: string }) => {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = buildFileUrl(undefined, nodeId, { suffix: "thumbnail" });

  return (
    <span
      className="bg-base-200 flex size-10 shrink-0 items-center justify-center
        overflow-hidden rounded"
    >
      {!failed && (
        <img
          src={thumbnailUrl}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </span>
  );
});

DeckImageThumbnail.displayName = "DeckImageThumbnail";
