import { Trash2Icon } from "lucide-react";
import { useRef } from "react";

interface Props {
  onDelete: () => void;
}

export const DeleteButton = ({ onDelete }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-base-content/50 hover:text-error shrink-0 rounded p-1
          transition-colors"
        aria-label="Delete objective"
      >
        <Trash2Icon className="h-4 w-4" />
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Delete objective?</h3>
          <p className="text-base-content/70 py-2 text-sm">
            This cannot be undone.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <button
              type="button"
              className="btn btn-error"
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
