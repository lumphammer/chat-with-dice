import { DeckSettingsDialog } from "#/components/FileManager/DeckSettingsDialog";
import { Settings2 } from "lucide-react";
import { memo, useState } from "react";

/**
 * The cog on a deck row in the Cards sidebar, opening the owner's Deck settings
 * without a trip to the File Manager. Only rendered for Decks the current user
 * owns — every setting behind it is owner-only.
 *
 * `onClosed` fires once the dialog is dismissed, so the row can re-read the
 * Deck's draw rule (which lives in the owner's store, not room state) rather
 * than waiting for the next draw to refresh it.
 */
export const DeckSettingsCogButton = memo(
  ({
    nodeId,
    name,
    onClosed,
  }: {
    nodeId: string;
    name: string;
    onClosed: () => void;
  }) => {
    const [open, setOpen] = useState(false);

    const handleClose = () => {
      setOpen(false);
      onClosed();
    };

    return (
      <>
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-square"
          aria-label={`Deck settings for ${name}`}
          title="Deck settings"
          onClick={() => setOpen(true)}
        >
          <Settings2 size={16} />
        </button>
        <DeckSettingsDialog
          nodeId={nodeId}
          name={name}
          open={open}
          onClose={handleClose}
        />
      </>
    );
  },
);

DeckSettingsCogButton.displayName = "DeckSettingsCogButton";
