import { ConfirmButton } from "./ConfirmButton";
import { PlayIcon } from "lucide-react";

interface Props {
  /** Whether there is already a story to pick up, rather than one to shuffle. */
  hasStoryInProgress: boolean;
  onBeginPlay: () => void;
}

/**
 * Leaves setup. Asks first because it is the moment the sheet stops being a form
 * and the deck gets shuffled — not irreversible (there is a way back), but not
 * something to do with a stray click either.
 */
export const BeginPlayButton = ({ hasStoryInProgress, onBeginPlay }: Props) => (
  <ConfirmButton
    className="btn btn-primary w-full"
    title="Begin play?"
    body={
      hasStoryInProgress
        ? `The sheet settles into prose and the story picks up where it left
           off. You can come back to setup if you need to.`
        : `The sheet settles into prose and a fresh Story Deck is shuffled. You
           can come back to setup if you need to.`
    }
    confirmLabel="Begin play"
    onConfirm={onBeginPlay}
  >
    <PlayIcon className="h-5 w-5" />
    Begin play
  </ConfirmButton>
);
