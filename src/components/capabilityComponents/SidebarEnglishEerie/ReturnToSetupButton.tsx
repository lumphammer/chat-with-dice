import { ConfirmButton } from "./ConfirmButton";
import { Undo2Icon } from "lucide-react";

interface Props {
  onReturnToSetup: () => void;
}

/**
 * The way back out of play, for a room that began it too early. Nothing is lost
 * — the deck and the cards drawn from it are still there when play resumes —
 * but it takes the whole table's tools away, so it asks.
 */
export const ReturnToSetupButton = ({ onReturnToSetup }: Props) => (
  <ConfirmButton
    className="btn btn-sm btn-ghost w-full"
    title="Go back to setup?"
    body="The story is kept — the deck, the cards drawn from it, Spirit and
      Resolve are all where you left them, and beginning play again picks up
      where you left off rather than reshuffling."
    confirmLabel="Back to setup"
    onConfirm={onReturnToSetup}
  >
    <Undo2Icon className="h-4 w-4" />
    Back to setup
  </ConfirmButton>
);
