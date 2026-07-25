import { Settings2 } from "lucide-react";
import { memo } from "react";

/**
 * The cog on a deck row in the Cards sidebar, opening the owner's Deck settings
 * without a trip to the File Manager. Only rendered for Decks the current user
 * owns — every setting behind it is owner-only.
 *
 * Trigger only: the dialog itself is rendered once by `DeckRow`, because this
 * button changes rows depending on whether the Deck dwindles and a dialog
 * mounted inside it would be destroyed by the move.
 */
export const DeckSettingsCogButton = memo(
  ({ name, onOpen }: { name: string; onOpen: () => void }) => (
    <button
      type="button"
      className="btn btn-sm btn-ghost btn-square"
      aria-label={`Deck settings for ${name}`}
      title="Deck settings"
      onClick={onOpen}
    >
      <Settings2 size={16} />
    </button>
  ),
);

DeckSettingsCogButton.displayName = "DeckSettingsCogButton";
