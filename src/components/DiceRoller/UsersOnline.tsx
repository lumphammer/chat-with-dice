import type { OnlineUser } from "#/validators/webSocketMessageSchemas";
import { OnlineUserBadge } from "./OnlineUserBadge";
import { memo, useMemo } from "react";

const MAX_BADGES = 8;

export const UsersOnline = memo(
  ({ usersOnline, chatId }: { usersOnline: OnlineUser[]; chatId: string }) => {
    const sorted = useMemo(() => {
      return usersOnline.toSorted((a, b) => {
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
      <div
        className="text-middle flex h-(--size) flex-row items-center
          justify-center gap-1"
      >
        {/*Online:*/}
        {sorted.slice(0, MAX_BADGES).map((user) => (
          <OnlineUserBadge
            key={user.chatId}
            user={user}
            isCurrentUser={user.chatId === chatId}
          />
        ))}
        {usersOnline.length > MAX_BADGES && "..."}
      </div>
    );
  },
);
