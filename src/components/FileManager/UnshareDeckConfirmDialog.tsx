import { Unlink2 } from "lucide-react";
import { forwardRef, useId } from "react";

/**
 * Confirmation shown before unsharing a Deck whose Pile has a non-empty Discard.
 *
 * Unsharing a plain file is harmless and needs no confirmation. Unsharing a Deck
 * is different: it revokes the grant, so the room's Pile — and the Discard that
 * records a half-drawn session — is dropped for good and cannot be undone
 * (ADR-0001). Binning, which *is* undoable, hides the Pile instead; this dialog
 * guards only the destructive path.
 *
 * Controlled by the caller's ref via `showModal()`, mirroring the other file
 * manager dialogs.
 */
export const UnshareDeckConfirmDialog = forwardRef<
  HTMLDialogElement,
  { name: string; onConfirm: () => void }
>(({ name, onConfirm }, ref) => {
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
            Unshare "{name}"?
          </h3>
          <p className="text-base-content/70 py-2">
            This deck's pile has cards in its discard. Unsharing removes the
            deck from the room and clears the pile — this cannot be undone. To
            keep the pile for later, move the deck to the trash instead.
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
              <Unlink2 size={16} />
              Unshare
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

UnshareDeckConfirmDialog.displayName = "UnshareDeckConfirmDialog";
