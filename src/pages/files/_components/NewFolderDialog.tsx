import { actions } from "astro:actions";
import { FolderPlus } from "lucide-react";
import { memo, useRef, useState } from "react";

type CreatedFolder = {
  id: string;
  name: string;
};

export const NewFolderDialog = memo(
  ({
    currentFolderId,
    onCreated,
  }: {
    currentFolderId: string | null;
    onCreated: (folder: CreatedFolder) => void;
  }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpen = () => {
      setName("");
      setError(null);
      dialogRef.current?.showModal();
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;

      setIsSubmitting(true);
      setError(null);

      const result = await actions.files.createFolder({
        name: trimmed,
        parentFolderId: currentFolderId,
      });

      setIsSubmitting(false);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      dialogRef.current?.close();
      onCreated(result.data);
    };

    return (
      <>
        <button className="btn btn-ghost btn-sm gap-1" onClick={handleOpen}>
          <FolderPlus size={16} />
          New Folder
        </button>
        <dialog ref={dialogRef} closedby="any" className="modal">
          <div className="modal-box">
            <h3 className="text-lg font-bold">New Folder</h3>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <input
                className="input input-bordered w-full"
                placeholder="Folder name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                maxLength={128}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              {error && <p className="text-error text-sm">{error}</p>}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => dialogRef.current?.close()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!name.trim() || isSubmitting}
                >
                  {isSubmitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </>
    );
  },
);

NewFolderDialog.displayName = "NewFolderDialog";
