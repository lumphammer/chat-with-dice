import type { SharedItem } from "#/capabilities/files/common";
import { getRelativeTimeString } from "#/components/DiceRoller/TimeDisplay";
import { NodeIcon } from "#/components/FileManager/NodeIcon";
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
    onSelect,
  }: {
    item: SharedItem;
    roomId: string;
    onSelect: (item: SharedItem) => void;
  }) => {
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="hover:bg-base-200 flex w-full min-w-0 cursor-pointer
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
              by {item.userDisplayName}
            </span>
          </div>
        </button>
      </li>
    );
  },
);

SharedItemListItem.displayName = "SharedItemListItem";
