import type { OnlineUser } from "#/validators/webSocketMessageSchemas";
import { OnlineUserBadge } from "./OnlineUserBadge";
import { X } from "lucide-react";
import { memo, useCallback, useMemo, useRef } from "react";

const MAX_BADGES = 8;
const MULTIPLY_USERS_BY = 1;

export const UsersOnline = memo(
  ({
    usersOnline,
    chatId,
    roomOwnerId,
  }: {
    usersOnline: OnlineUser[];
    chatId: string | null;
    roomOwnerId: string;
  }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const handleOpen = useCallback(() => {
      dialogRef.current?.showModal();
    }, []);

    const sorted = useMemo(() => {
      const multiplied =
        MULTIPLY_USERS_BY > 1
          ? Array.from({ length: MULTIPLY_USERS_BY }, () => usersOnline).flat()
          : usersOnline;
      return multiplied.toSorted((a, b) => {
        if (a.chatId === chatId && b.chatId !== chatId) {
          return -1;
        } else if (a.chatId !== chatId && b.chatId === chatId) {
          return 1;
        } else {
          return a.chatId.localeCompare(b.chatId);
        }
      });
    }, [chatId, usersOnline]);

    return (
      <>
        <button
          className="btn btn-ghost text-middle flex h-(--size) flex-row
            items-center justify-center gap-1"
          onClick={handleOpen}
        >
          {/*Online:*/}
          {sorted.slice(0, MAX_BADGES).map((user, i) => (
            <OnlineUserBadge
              key={MULTIPLY_USERS_BY > 1 ? `${user.chatId}:${i}` : user.chatId}
              user={user}
              isCurrentUser={user.chatId === chatId}
            />
          ))}
          {sorted.length > MAX_BADGES && (
            <span className="text-base-content text-xl">…</span>
          )}
        </button>
        <dialog ref={dialogRef} className="modal">
          <div className="modal-box flex max-h-[70vh] flex-col gap-2 pb-0">
            <form method="dialog">
              <button
                className="btn btn-sm btn-circle btn-ghost absolute top-2
                  right-2"
              >
                <X />
              </button>
            </form>
            <h3 className="text-lg font-bold capitalize">Users online</h3>
            <ul
              className="list bg-base-100 rounded-box flex-1 overflow-auto pb-4
                shadow-md"
            >
              {sorted.map((user, i) => (
                <li
                  className="list-row bg-base-200"
                  key={
                    MULTIPLY_USERS_BY > 1 ? `${user.chatId}:${i}` : user.chatId
                  }
                >
                  <div>
                    <OnlineUserBadge
                      key={
                        MULTIPLY_USERS_BY > 1
                          ? `${user.chatId}:${i}`
                          : user.chatId
                      }
                      user={user}
                      isCurrentUser={user.chatId === chatId}
                      showImage
                      large
                    />
                  </div>
                  <div>
                    <div>{user.displayName}</div>
                    <div className="[] flex flex-row">
                      {user.chatId === chatId && (
                        <div
                          className="peer text-xs font-semibold uppercase
                            opacity-60"
                        >
                          You
                        </div>
                      )}
                      {user.chatId === roomOwnerId && (
                        <div
                          className="peer text-xs font-semibold uppercase
                            opacity-60 not-first:before:mx-1
                            not-first:before:content-['/']"
                        >
                          Room Owner
                        </div>
                      )}
                      <div
                        className="peer text-xs font-semibold uppercase
                          opacity-60 not-first:before:mx-1
                          not-first:before:content-['/']"
                      >
                        {user.loggedIn ? "Logged in" : "Anonymous"}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </>
    );
  },
);
