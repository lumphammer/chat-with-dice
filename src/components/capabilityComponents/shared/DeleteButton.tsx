import { Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  onDelete: () => void;
  itemType?: string;
  challengePhrase?: string;
  label?: string;
}

export const DeleteButton = ({
  onDelete,
  itemType = "item",
  challengePhrase,
  label,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [inputValue, setInputValue] = useState("");

  const canDelete = !challengePhrase || inputValue === challengePhrase;

  const handleOpen = () => {
    setInputValue("");
    dialogRef.current?.showModal();
  };

  return (
    <>
      {label ? (
        <button
          type="button"
          onClick={handleOpen}
          className="btn btn-error"
          aria-label={`Delete ${itemType}`}
        >
          <Trash2Icon className="h-4 w-4" />
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="muted hover:text-error shrink-0 cursor-pointer rounded p-1
            transition-colors"
          aria-label={`Delete ${itemType}`}
        >
          <Trash2Icon className="h-4 w-4" />
        </button>
      )}

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold capitalize">Delete {itemType}?</h3>
          <p className="muted py-2 text-sm">This cannot be undone.</p>
          {challengePhrase && (
            <>
              <p className="muted pb-2 text-sm">
                Type <strong>{challengePhrase}</strong> to confirm.
              </p>
              <input
                className="input input-bordered w-full"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={challengePhrase}
              />
            </>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <button
              type="button"
              className="btn btn-error"
              disabled={!canDelete}
              onClick={() => {
                onDelete();
                dialogRef.current?.close();
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
    </>
  );
};
