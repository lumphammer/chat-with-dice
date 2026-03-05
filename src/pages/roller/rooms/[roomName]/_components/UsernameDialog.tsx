import { generateRandomName } from "@/lib/generateRandomName";
import { memo, useId, useLayoutEffect, useRef, useState } from "react";

type UsernameDialogProps = {
  initialUsername: string;
  onSetUsername: ((username: string) => void) | null;
  loggedIn: boolean;
};

export const UsernameDialog = memo(
  ({ initialUsername, onSetUsername, loggedIn }: UsernameDialogProps) => {
    const usernameDialogRef = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const [username, setUsername] = useState(
      initialUsername ?? generateRandomName(),
    );

    useLayoutEffect(() => {
      if (usernameDialogRef.current && initialUsername === "") {
        usernameDialogRef.current.showModal();
      }
    }, [initialUsername]);

    return (
      <>
        <div
          className="text-middle inline-flex h-(--size) flex-col justify-center"
        >
          {initialUsername}
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
              ref={usernameDialogRef}
              closedby={initialUsername ? "any" : "none"}
              className="animate-fadeout open:animate-fadein
                backdrop:animate-fadeout open:backdrop:animate-fadein prose
                absolute m-auto max-w-200 min-w-1/2 flex-col rounded-lg
                bg-(--user-colour) p-4 px-4 text-base shadow-lg
                [transition:display_300ms_allow-discrete,overlay_300ms_allow-discrete]
                backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex"
            >
              <h2 className="">Pick a username</h2>
              <form
                className="join flex w-full flex-row flex-wrap"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (onSetUsername) {
                    onSetUsername(username);
                  }
                  usernameDialogRef?.current?.close();
                }}
              >
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-primary join-item flex-2 basis-auto"
                />
                <button
                  className="btn btn-secondary join-item flex-1 basis-auto"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setUsername(generateRandomName());
                  }}
                >
                  Generate random
                </button>
                <button className="btn btn-primary join-item flex-1 basis-auto">
                  Save username
                </button>
                {initialUsername && (
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

UsernameDialog.displayName = "UsernameDialog";
