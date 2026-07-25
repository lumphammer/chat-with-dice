import { DeckSettingsDialog } from "./DeckSettingsDialog";
import { Settings2 } from "lucide-react";
import { memo, useState } from "react";

/**
 * The "Deck settings" entry in a folder's actions menu: the menu button plus the
 * dialog it opens. {@link DeckSettingsDialog} is controlled, so the `open` state
 * lives here — the Cards sidebar's cog owns its own copy and renders the same
 * dialog.
 */
export const DeckSettingsMenuItem = memo(
  ({ nodeId, name }: { nodeId: string; name: string }) => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          <Settings2 size={14} />
          Deck settings
        </button>
        <DeckSettingsDialog
          nodeId={nodeId}
          name={name}
          open={open}
          onClose={() => setOpen(false)}
        />
      </>
    );
  },
);

DeckSettingsMenuItem.displayName = "DeckSettingsMenuItem";
