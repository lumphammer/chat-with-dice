import type { SharedItem } from "#/capabilities/files/common";
import { NodeIcon } from "#/components/FileManager/NodeIcon";
import { getRelativeTimeString } from "#/utils/getRelativeTimeString.ts";
import { RemoveShareControl } from "./RemoveShareControl";
import { memo } from "react";

const UNKNOWN_SHARED_TIME_LABEL = "shared earlier";

const getSharedTimeLabel = (dateShared: number) => {
  if (dateShared === 0) return UNKNOWN_SHARED_TIME_LABEL;

  const language = typeof navigator === "undefined" ? "en" : navigator.language;
  return getRelativeTimeString(dateShared, language);
};

export const SharedItemListItem = memo(
  ({
    item,
    roomId,
    currentUserId,
    roomOwnerId,
    onSelect,
  }: {
    item: SharedItem;
    roomId: string;
    currentUserId: string | undefined;
    roomOwnerId: string;
    onSelect: (item: SharedItem) => void;
  }) => {
    const isOwnShare =
      currentUserId !== undefined && item.userId === currentUserId;
    // The room owner can clear any share; anyone can clear their own without
    // drilling into it. Authorisation is re-checked server-side either way.
    const canRemove =
      currentUserId !== undefined &&
      (currentUserId === roomOwnerId || isOwnShare);

    return (
      <li className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="hover:bg-base-200 flex min-w-0 flex-1 cursor-pointer
            items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
        >
          <span
            className="bg-base-200 flex size-10 shrink-0 items-center
              justify-center overflow-hidden rounded"
          >
            <NodeIcon
              node={item.node}
              ownerUserId={item.userId}
              roomId={roomId}
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="block truncate">{item.node.name}</span>
            <span className="text-base-content/50 block truncate text-sm">
              <time
                dateTime={
                  item.dateShared === 0
                    ? undefined
                    : new Date(item.dateShared).toISOString()
                }
              >
                {getSharedTimeLabel(item.dateShared)}
              </time>{" "}
              by {isOwnShare ? "you" : item.userDisplayName}
            </span>
          </div>
        </button>
        {canRemove && <RemoveShareControl item={item} />}
      </li>
    );
  },
);

SharedItemListItem.displayName = "SharedItemListItem";
