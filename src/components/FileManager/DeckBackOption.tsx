import { buildFileUrl } from "./fileUrl";
import { memo, useState } from "react";

/**
 * One selectable image in the Common Back picker: a radio, a thumbnail, and the
 * image's name. Broken out so {@link DeckSettingsDialog} stays focused on the
 * settings themselves. The thumbnail is of the owner's own file, so it needs no
 * owner segment or room id; it hides itself if it fails to load.
 */
export const DeckBackOption = memo(
  ({
    nodeId,
    name,
    checked,
    disabled,
    onSelect,
  }: {
    nodeId: string;
    name: string;
    checked: boolean;
    disabled?: boolean;
    onSelect: () => void;
  }) => {
    const [thumbnailFailed, setThumbnailFailed] = useState(false);
    const thumbnailUrl = buildFileUrl(undefined, nodeId, {
      suffix: "thumbnail",
    });

    return (
      <label
        className="hover:bg-base-200 flex cursor-pointer items-center gap-3
          rounded-lg p-2"
      >
        <input
          type="radio"
          name="deck-common-back"
          className="radio radio-primary shrink-0"
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
        />
        <span
          className="bg-base-200 flex size-10 shrink-0 items-center
            justify-center overflow-hidden rounded"
        >
          {!thumbnailFailed && (
            <img
              src={thumbnailUrl}
              alt=""
              onError={() => setThumbnailFailed(true)}
              className="size-full object-cover"
            />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
      </label>
    );
  },
);

DeckBackOption.displayName = "DeckBackOption";
