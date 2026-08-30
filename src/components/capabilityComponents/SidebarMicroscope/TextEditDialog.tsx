import { MAX_TEXT_LENGTH } from "#/capabilities/microscope/common";
import { useEffect, useId, useRef, useState } from "react";

const TEXT_ROWS = 3;

interface Props {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  initialValue: string;
  onClose: () => void;
  onSave: (text: string) => void;
}

/**
 * A dialog with one textarea in it, for the parts of the game that are just a
 * line of writing — a Legacy has no Tone and no place on the timeline, so it
 * has nothing else to fill a dialog with.
 */
export const TextEditDialog = ({
  open,
  title,
  label,
  placeholder,
  initialValue,
  onClose,
  onSave,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(initialValue);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      // Seeded on open, and not re-seeded from `initialValue` afterwards: an
      // edit landing from someone else mid-sentence would wipe what is being
      // typed here.
      // oxlint-disable-next-line react/set-state-in-effect
      setDraft(initialValue);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
    // oxlint-disable-next-line exhaustive-deps, react/exhaustive-effect-dependencies
  }, [open]);

  const canSave = draft.trim().length > 0;

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    onSave(draft.trim());
    onClose();
  };

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
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="floating-label">
            <span>{label}</span>
            <textarea
              className="textarea textarea-neutral w-full"
              rows={TEXT_ROWS}
              maxLength={MAX_TEXT_LENGTH}
              placeholder={placeholder ?? label}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSave}
            >
              Save
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};
