import { generateRandomName } from "#/lib/generateRandomName";
import { memo, useId, useLayoutEffect, useRef, useState } from "react";

type DisplayNameDialogProps = {
  initialDisplayName: string;
  onSetDisplayName: ((newDisplayName: string) => void) | null;
  loggedIn: boolean;
};

export const DisplayNameDialog = memo(
  ({
    initialDisplayName,
    onSetDisplayName,
    loggedIn,
  }: DisplayNameDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const [displayName, setDisplayName] = useState(
      initialDisplayName ?? generateRandomName(),
    );

    useLayoutEffect(() => {
      if (dialogRef.current && initialDisplayName === "") {
        dialogRef.current.showModal();
      }
    }, [initialDisplayName]);

    return (
      <>
        <div
          className="text-middle inline-flex h-(--size) flex-col justify-center"
        >
          {initialDisplayName}
        </div>
        {!loggedIn && (
          <>
            <button
              className="btn btn-secondary btn-sm btn-link"
              // @ts-expect-error invoker APIs not in react types
              command="show-modal"
              commandfor={dialogId}
            >
              Change
            </button>

            <dialog
              id={dialogId}
              ref={dialogRef}
              closedby={initialDisplayName ? "any" : "none"}
              className="animate-fadeout open:animate-fadein
                backdrop:animate-fadeout open:backdrop:animate-fadein prose
                absolute m-auto max-w-200 min-w-1/2 flex-col rounded-lg
                bg-(--user-colour) p-4 px-4 text-base shadow-lg
                [transition:display_300ms_allow-discrete,overlay_300ms_allow-discrete]
                backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex"
            >
              <h2 className="">Enter a display name</h2>
              <form
                className="join flex w-full flex-row flex-wrap"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (onSetDisplayName) {
                    onSetDisplayName(displayName);
                  }
                  dialogRef?.current?.close();
                }}
              >
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input input-primary join-item flex-2 basis-auto"
                />
                <button
                  className="btn btn-secondary join-item flex-1 basis-auto"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setDisplayName(generateRandomName());
                  }}
                >
                  Generate random
                </button>
                <button className="btn btn-primary join-item flex-1 basis-auto">
                  Save display name
                </button>
                {initialDisplayName && (
                  <button
                    type="button"
                    // @ts-expect-error invoker api not in react types yet
                    commandFor={dialogId}
                    command="close"
                    className="btn btn-warning join-item flex-1 basis-auto"
                  >
                    Cancel
                  </button>
                )}
              </form>
            </dialog>
          </>
        )}
      </>
    );
  },
);

DisplayNameDialog.displayName = "DisplayNameDialog";
