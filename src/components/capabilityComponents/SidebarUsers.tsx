import { authClient } from "#/auth/authClient.ts";
import { usersClient } from "#/capabilities/users/client";
import { useRoomInfoContext } from "../DiceRoller/contexts/roomInfoContext";
import { OnlineUserBadge } from "./OnlineUserBadge";
import { SidebarPanel } from "./shared/SidebarPanel";
import { memo, useMemo } from "react";

/**
 * Sidebar panel for the `users` capability. Renders everyone recently seen in
 * the room from capability state; online users come first, with those who have
 * left shown dimmed below. Driven entirely by `usersClient` state — there is no
 * bespoke presence plumbing.
 */
export const SidebarUsers = memo(() => {
  const { data: sessionData } = authClient.useSession();
  const userId = sessionData?.user.id;
  const { roomOwnerId } = useRoomInfoContext();

  const capInfo = usersClient.useMount();
  const recentUsers = capInfo.initialised ? capInfo.state.recentUsers : null;

  const sorted = useMemo(() => {
    if (!recentUsers) return [];
    return recentUsers.toSorted((a, b) => {
      // Online first, then the current user, then alphabetical by id.
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      return a.userId.localeCompare(b.userId);
    });
  }, [recentUsers, userId]);

  if (!recentUsers) {
    return (
      <SidebarPanel title="Users" isSaving={false}>
        Loading…
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel title="Users" isSaving={false}>
      <ul className="list gap-1 overflow-auto">
        {sorted.map((user) => {
          const isYou = user.userId === userId;
          return (
            <li
              className="list-row bg-base-200 data-offline:opacity-50"
              data-offline={user.isOnline ? undefined : "true"}
              key={user.userId}
            >
              <div>
                <OnlineUserBadge
                  user={user}
                  isCurrentUser={isYou}
                  showImage
                  large
                />
              </div>
              <div>
                <div>{user.displayName}</div>
                <div className="flex flex-row flex-wrap">
                  {isYou && <UserTag>You</UserTag>}
                  {user.isAnonymous && <UserTag>Anonymous</UserTag>}
                  {user.userId === roomOwnerId && <UserTag>Room Owner</UserTag>}
                  {!user.isOnline && <UserTag>Offline</UserTag>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </SidebarPanel>
  );
});

SidebarUsers.displayName = "SidebarUsers";

const UserTag = memo(({ children }: { children: React.ReactNode }) => (
  <div
    className="peer text-xs font-semibold uppercase opacity-60
      not-first:before:mx-1 not-first:before:content-['/']"
  >
    {children}
  </div>
));

UserTag.displayName = "UserTag";
