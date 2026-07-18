import { DeckImageThumbnail } from "./DeckImageThumbnail";
import { memo } from "react";

/**
 * One selectable image in the Common Back picker: a radio, a thumbnail, and the
 * image's name. Broken out so {@link DeckSettingsDialog} stays focused on the
 * settings themselves.
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
        <DeckImageThumbnail nodeId={nodeId} />
        <span className="min-w-0 flex-1 truncate">{name}</span>
      </label>
    );
  },
);

DeckBackOption.displayName = "DeckBackOption";
