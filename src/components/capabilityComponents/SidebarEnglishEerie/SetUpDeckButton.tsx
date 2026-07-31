import { ConfirmButton } from "./ConfirmButton";
import { ShuffleIcon } from "lucide-react";

interface Props {
  onSetUpDeck: () => void;
}

/**
 * Performs the setup ritual again, mid-play. A fresh deck throws away whatever
 * is left of the old one and every card drawn from it — and in play there is
 * always a story to throw away — so it asks first.
 */
export const SetUpDeckButton = ({ onSetUpDeck }: Props) => (
  <ConfirmButton
    className="btn btn-sm btn-outline w-full"
    title="Set up a new deck?"
    body="This shuffles a fresh deck and forgets the current story's cards. The
      Protagonist, Spirit and Resolve are left alone."
    confirmLabel="Set up"
    onConfirm={onSetUpDeck}
  >
    <ShuffleIcon className="h-4 w-4" />
    Set up a new deck
  </ConfirmButton>
);
