import { Trash2 } from "lucide-react";
import { forwardRef, useId } from "react";

/**
 * Confirmation shown before a share is removed from the room via the
 * shared-items list trashcan.
 *
 * Removal always confirms — it clears the item for everyone in the room, and a
 * room owner may be acting on something that isn't theirs. When the target is a
 * Deck whose Pile has a non-empty Discard, removing it also drops that Pile for
 * good (ADR-0001), so `deckHasPile` swaps in the stronger, irreversible warning.
 *
 * Controlled by the caller's ref via `showModal()`, mirroring the other file
 * manager dialogs.
 */
export const RemoveShareConfirmDialog = forwardRef<
  HTMLDialogElement,
  { name: string; deckHasPile: boolean; onConfirm: () => void }
>(({ name, deckHasPile, onConfirm }, ref) => {
  // Ties the dialog to its visible heading so assistive tech announces the
  // dialog's purpose rather than a bare "dialog".
  const titleId = useId();
  return (
    // The wrapping div lets the dialog escape a menu's immediate-child styling
    // when it is rendered alongside one.
    <div className="contents">
      <dialog ref={ref} className="modal" aria-labelledby={titleId}>
        <div className="modal-box">
          <h3 id={titleId} className="text-lg font-bold">
            Remove "{name}"?
          </h3>
          <p className="text-base-content/70 py-2">
            {deckHasPile
              ? `This deck's pile has cards in its discard. Removing it from the
                 room clears the pile — this cannot be undone.`
              : `This removes the shared item from the room for everyone. The
                 owner keeps their own copy.`}
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <button
              type="button"
              className="btn btn-error"
              onClick={(e) => {
                onConfirm();
                e.currentTarget.closest("dialog")?.close();
              }}
            >
              <Trash2 size={16} />
              Remove
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
});

RemoveShareConfirmDialog.displayName = "RemoveShareConfirmDialog";
