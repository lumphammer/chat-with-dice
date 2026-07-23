import { DeckBackOption } from "./DeckBackOption";
import { memo } from "react";

export type DeckImage = { nodeId: string; name: string };

/**
 * The Common Back picker of the Deck settings dialog: a radio list of the
 * Deck's images (plus a "none" option) that sets which one is shown as the back
 * of every Card. Broken out so {@link DeckSettingsDialog} stays focused on
 * load/mutation state.
 */
export const DeckCommonBackPicker = memo(
  ({
    images,
    commonBackId,
    disabled,
    onSelect,
  }: {
    images: DeckImage[];
    commonBackId: string | null;
    disabled: boolean;
    onSelect: (backNodeId: string | null) => void;
  }) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium">Common back</span>
        <span className="text-base-content/60">
          The back shown for every card. The chosen image stops being a card in
          its own right.
        </span>
        <div className="mt-2 flex flex-col gap-1">
          <label
            className="hover:bg-base-200 flex cursor-pointer items-center gap-3
              rounded-lg p-2"
          >
            <input
              type="radio"
              name="deck-common-back"
              className="radio radio-primary shrink-0"
              checked={commonBackId === null}
              disabled={disabled}
              onChange={() => onSelect(null)}
            />
            <span className="min-w-0 flex-1">No common back</span>
          </label>
          {images.map((image) => (
            <DeckBackOption
              key={image.nodeId}
              nodeId={image.nodeId}
              name={image.name}
              checked={commonBackId === image.nodeId}
              disabled={disabled}
              onSelect={() => onSelect(image.nodeId)}
            />
          ))}
          {images.length === 0 && (
            <span className="text-base-content/60 p-2">
              This deck has no images to use as a back yet.
            </span>
          )}
        </div>
      </div>
    );
  },
);

DeckCommonBackPicker.displayName = "DeckCommonBackPicker";
