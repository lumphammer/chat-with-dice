import { useEffect, useId, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  /** What else goes with it, when the item has children. */
  consequence?: string;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Controlled, unlike the shared `DeleteButton`, because the trigger is a menu
 * item rather than a button of its own — the card owns both.
 */
export const ConfirmDeleteDialog = ({
  open,
  title,
  consequence,
  onClose,
  onConfirm,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className="modal-box">
        <h3 id={titleId} className="text-lg font-bold">
          {title}
        </h3>
        <p className="muted py-2 text-sm">
          {consequence ? `${consequence} ` : ""}This cannot be undone.
        </p>
        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};
