import { actions } from "astro:actions";
import { Shredder } from "lucide-react";
import { memo, useRef } from "react";

export const HardDeleteDialog = memo(
  ({
    nodeId,
    name,
    onAfterDelete,
  }: {
    nodeId: string;
    name: string;
    onAfterDelete: () => void;
  }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    const handleHardDelete = async () => {
      const result = await actions.files.hardDeleteNode({ nodeId });
      if (result.error) {
        console.error("Failed to hard delete:", result.error);
        return;
      }
      onAfterDelete();
    };

    const handleClick = () => {
      console.log("handleClick", nodeId);
      dialogRef.current?.showModal();
    };

    return (
      <>
        <button type="button" className="text-error-text" onClick={handleClick}>
          <Shredder size={14} />
          Delete permanently
        </button>
        {/* this extra div is to allow the dialog to escape the menu's
          immediate-child styling */}
        <div className="contents">
          <dialog ref={dialogRef} className="modal">
            <div className="modal-box">
              <h3 className="text-lg font-bold capitalize">
                Permanently delete "{name}"?
              </h3>
              <p className="text-base-content/70 py-2 text-sm">
                This cannot be undone.
              </p>
              <div className="modal-action">
                <form method="dialog">
                  <button className="btn">Cancel</button>
                </form>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void handleHardDelete();
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
        </div>
      </>
    );
  },
);
