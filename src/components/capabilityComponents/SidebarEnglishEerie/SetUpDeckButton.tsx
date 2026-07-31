import { ShuffleIcon } from "lucide-react";
import { useRef } from "react";

interface Props {
  /** Whether there is a story under way that setting up again would abandon. */
  hasStoryInProgress: boolean;
  onSetUpDeck: () => void;
}

/**
 * Performs the setup ritual. Building a fresh deck throws away whatever is left
 * of the old one and every card drawn from it, so once a story is under way it
 * asks first — same modal shape as `DeleteButton`, different question.
 */
export const SetUpDeckButton = ({ hasStoryInProgress, onSetUpDeck }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline w-full"
        onClick={() => {
          if (hasStoryInProgress) {
            dialogRef.current?.showModal();
          } else {
            onSetUpDeck();
          }
        }}
      >
        <ShuffleIcon className="h-4 w-4" />
        {hasStoryInProgress ? "Set up a new deck" : "Set up the deck"}
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Set up a new deck?</h3>
          <p className="text-base-content/70 py-2 text-sm">
            This shuffles a fresh deck and forgets the current story's cards.
            The Protagonist, Spirit and Resolve are left alone.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onSetUpDeck();
                dialogRef.current?.close();
              }}
            >
              Set up
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
};
