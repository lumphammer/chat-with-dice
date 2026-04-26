import { authClient } from "#/utils/auth-client";
import type { OnlineUser } from "#/validators/webSocketMessageSchemas";
import { OnlineUserBadge } from "./OnlineUserBadge";
import { X } from "lucide-react";
import { memo, useCallback, useMemo, useRef } from "react";

const MAX_BADGES = 8;
const MULTIPLY_USERS_BY = 1;

export const UsersOnline = memo(
  ({
    usersOnline,
    roomOwnerId,
  }: {
    usersOnline: OnlineUser[];
    roomOwnerId: string;
  }) => {
    const { data: sessionData } = authClient.useSession();
    const userId = sessionData?.user.id;

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
        if (a.userId === userId && b.userId !== userId) {
          return -1;
        } else if (a.userId !== userId && b.userId === userId) {
          return 1;
        } else {
          return a.userId.localeCompare(b.userId);
        }
      });
    }, [userId, usersOnline]);

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
              key={MULTIPLY_USERS_BY > 1 ? `${user.userId}:${i}` : user.userId}
              user={user}
              isCurrentUser={user.userId === userId}
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
              {sorted.map((user, i) => {
                const isYou = user.userId === userId;
                const isAnonymous = isYou && sessionData?.user.isAnonymous;
                const loggedIn = !isAnonymous && user.loggedIn;
                return (
                  <li
                    className="list-row bg-base-200"
                    key={
                      MULTIPLY_USERS_BY > 1
                        ? `${user.userId}:${i}`
                        : user.userId
                    }
                  >
                    <div>
                      <OnlineUserBadge
                        key={
                          MULTIPLY_USERS_BY > 1
                            ? `${user.userId}:${i}`
                            : user.userId
                        }
                        user={user}
                        isCurrentUser={user.userId === userId}
                        showImage
                        large
                      />
                    </div>
                    <div>
                      <div>{user.displayName}</div>
                      <div className="[] flex flex-row">
                        {isYou && (
                          <div
                            className="peer text-xs font-semibold uppercase
                              opacity-60"
                          >
                            You
                          </div>
                        )}
                        {isAnonymous && (
                          <div
                            className="peer text-xs font-semibold uppercase
                              opacity-60 not-first:before:mx-1
                              not-first:before:content-['/']"
                          >
                            Anonymous
                          </div>
                        )}
                        {user.userId === roomOwnerId && (
                          <div
                            className="peer text-xs font-semibold uppercase
                              opacity-60 not-first:before:mx-1
                              not-first:before:content-['/']"
                          >
                            Room Owner
                          </div>
                        )}
                        {loggedIn && (
                          <div
                            className="peer text-xs font-semibold uppercase
                              opacity-60 not-first:before:mx-1
                              not-first:before:content-['/']"
                          >
                            Logged in
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
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
