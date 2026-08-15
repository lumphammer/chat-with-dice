import { deriveHueFromUserId } from "#/utils/deriveHueFromUserId";
import type { UserHueStyle } from "../DiceRoller/types";
import { memo, useMemo } from "react";

/** The fields a badge needs to render — a structural subset of a room user. */
type BadgeUser = {
  userId: string;
  displayName: string;
  image?: string;
};

export const OnlineUserBadge = memo(
  ({
    user,
    isCurrentUser,
    showImage = false,
    large = false,
  }: {
    user: BadgeUser;
    isCurrentUser: boolean;
    showImage?: boolean;
    large?: boolean;
  }) => {
    const hue = useMemo(() => {
      return deriveHueFromUserId(user.userId);
    }, [user.userId]);

    const initials = useMemo(() => {
      const words = user.displayName.split(" ");
      return words.length > 1
        ? words[0][0] + words[1][0]
        : user.displayName.slice(0, 1);
    }, [user.displayName]);

    return (
      <div
        /* The initials are full-strength ink, not the /0.6 they used to be:
        that alpha put them at 2.70:1 on libris and plainLight. The bubble uses
        this same dark-on-light pair at full strength and passes, so the alpha
        was the whole of the problem. */
        className="flex size-5 flex-col items-center justify-center rounded-full
          border
          bg-[oklch(var(--bubble-light-l)_var(--bubble-light-c)_var(--user-hue))]
          text-[oklch(var(--bubble-dark-l)_var(--bubble-dark-c)_var(--user-hue))]
          data-current-user:h-6 data-current-user:w-6 data-current-user:border-2
          data-large:size-10
          dark:bg-[oklch(var(--bubble-dark-l)_var(--bubble-dark-c)_var(--user-hue))]
          dark:text-[oklch(var(--bubble-light-l)_var(--bubble-light-c)_var(--user-hue))]"
        data-current-user={isCurrentUser ? "true" : undefined}
        data-large={large ? "true" : undefined}
        style={
          {
            backgroundImage:
              showImage && user.image ? `url(${user.image})` : "none",
            backgroundSize: "100%",
            "--user-hue": hue,
          } satisfies UserHueStyle as UserHueStyle
        }
      >
        <span className="text-xs">{initials}</span>
      </div>
    );
  },
);

OnlineUserBadge.displayName = "OnlineUserBadge";
