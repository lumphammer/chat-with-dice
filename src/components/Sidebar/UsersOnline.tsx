import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { authClient } from "#/utils/auth-client";
import { OnlineUserBadge } from "../DiceRoller/OnlineUserBadge";
import { useRoomInfoContext } from "../DiceRoller/contexts/roomInfoContext";
import { useUsersOnlineContext } from "../DiceRoller/contexts/usersOnlineContext";
import { memo, useMemo } from "react";

const MULTIPLY_USERS_BY = 1;

export const UsersOnline = memo(() => {
  const { data: sessionData } = authClient.useSession();
  const userId = sessionData?.user.id;

  const { roomOwnerId } = useRoomInfoContext();
  const usersOnline = useUsersOnlineContext();

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
    <SidebarPanel title="Users Online" isSaving={false}>
      <ul
        className="list bg-base-100 rounded-box flex-1 overflow-auto pb-4
          shadow-md"
      >
        {sorted.map((user, i) => {
          const isYou = user.userId === userId;
          const isAnonymous = user.isAnonymous;
          return (
            <li
              className="list-row bg-base-200"
              key={MULTIPLY_USERS_BY > 1 ? `${user.userId}:${i}` : user.userId}
            >
              <div>
                <OnlineUserBadge
                  user={user}
                  isCurrentUser={user.userId === userId}
                  showImage
                  large
                />
              </div>
              <div>
                <div>{user.displayName}</div>
                <div className="flex flex-row flex-wrap">
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
                      className="peer text-xs font-semibold uppercase opacity-60
                        not-first:before:mx-1 not-first:before:content-['/']"
                    >
                      Anonymous
                    </div>
                  )}
                  {user.userId === roomOwnerId && (
                    <div
                      className="peer text-xs font-semibold uppercase opacity-60
                        not-first:before:mx-1 not-first:before:content-['/']"
                    >
                      Room Owner
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </SidebarPanel>
  );
});

UsersOnline.displayName = "UsersOnline";
