import { ConfirmButton } from "./ConfirmButton";
import { RotateCcwIcon } from "lucide-react";

interface Props {
  onResetGame: () => void;
}

/**
 * Starts the game over from a blank setup. Everything in the current game is
 * discarded, so it asks first.
 */
export const ResetGameButton = ({ onResetGame }: Props) => (
  <ConfirmButton
    className="btn btn-sm btn-ghost w-full"
    title="Reset the game?"
    body="This will permanently reset all the English Eerie info in this room, including the
      Protagonist details, Story Deck, Spirit and Resolve. You will return
      to a blank setup and begin afresh. This cannot be undone."
    confirmLabel="Reset the game"
    onConfirm={onResetGame}
  >
    <RotateCcwIcon className="h-4 w-4" />
    Reset the game
  </ConfirmButton>
);
