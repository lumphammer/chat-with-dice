import { useFeedback } from "../FeedbackContext";
import { DeckSettingsDialog } from "./DeckSettingsDialog";
import { actions } from "astro:actions";
import { Layers } from "lucide-react";
import { memo } from "react";

/**
 * The Deck-related menu items shared by NodeActionsMenu (a folder row) and
 * FolderActionsMenu (the folder you're currently inside): the Mark/Unmark as
 * Deck toggle, plus Deck settings once it's a deck. Rendered as a pair of <li>
 * elements so it drops straight into either <GenericMenu>. Only meaningful for a
 * folder; both call sites gate on the node being a folder before rendering it.
 */
export const DeckMenuItems = memo(
  ({
    nodeId,
    name,
    isDeck,
    onRefresh,
    wrapMenuAction,
  }: {
    nodeId: string;
    name: string;
    isDeck: boolean;
    onRefresh?: () => void;
    wrapMenuAction: (action: () => void) => () => void;
  }) => {
    const { onError } = useFeedback();

    const handleToggleDeck = async () => {
      const result = await actions.files.setFolderIsDeck({
        nodeId,
        isDeck: !isDeck,
      });
      if (result.error) {
        onError(`Failed to update ${name}: ${result.error.message}`);
        return;
      }
      onRefresh?.();
    };

    return (
      <>
        <li>
          <button type="button" onClick={wrapMenuAction(handleToggleDeck)}>
            <Layers size={14} />
            {isDeck ? "Unmark as Deck" : "Mark as Deck"}
          </button>
        </li>
        {isDeck && (
          <li>
            <DeckSettingsDialog nodeId={nodeId} name={name} />
          </li>
        )}
      </>
    );
  },
);

DeckMenuItems.displayName = "DeckMenuItems";
