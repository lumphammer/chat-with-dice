import { ConfirmButton } from "./ConfirmButton";
import { ShuffleIcon } from "lucide-react";
import { memo } from "react";

/**
 * Performs the setup ritual again, mid-play. A fresh deck throws away whatever
 * is left of the old one and every card drawn from it — and in play there is
 * always a story to throw away — so it asks first.
 */
export const ShuffleOrResetButton = memo(
  ({
    onSetUpDeck,
    onResetGame,
  }: {
    onSetUpDeck: () => void;
    onResetGame: () => void;
  }) => {
    return (
      <ConfirmButton
        className="btn btn-sm btn-outline w-full"
        title="Shuffle deck, or reset game?"
        body="Shuffling the deck sets up all 19 cards ready to be drawn but leaves your protagonist intact. Resetting clears everything and returns to setup mode."
        primaryLabel="Reset"
        onPrimary={onResetGame}
        primaryClass="danger"
        secondaryLabel="Shuffle"
        onSecondary={onSetUpDeck}
        secondaryClass="warning"
      >
        <ShuffleIcon className="h-4 w-4" />
        Shuffle or reset
      </ConfirmButton>
    );
  },
);

ShuffleOrResetButton.displayName = "ShuffleOrResetButton";
