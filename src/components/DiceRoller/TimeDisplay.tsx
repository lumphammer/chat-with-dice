import { getRelativeTimeString } from "#/utils/getRelativeTimeString";
import { memo, useState } from "react";

type TimeDisplayProps = {
  timeStamp: number;
};

const ISO_CORE_PART_LENGTH = 19;

export const TimeDisplay = memo(({ timeStamp }: TimeDisplayProps) => {
  const [showRelative, setShowrelative] = useState(true);
  return (
    <button
      className="cursor-pointer"
      onClick={() =>
        setShowrelative((currentShowRelative) => !currentShowRelative)
      }
    >
      <time
        className={"opacity-70"}
        dateTime={new Date(timeStamp)
          .toISOString()
          .slice(0, ISO_CORE_PART_LENGTH)}
      >
        {showRelative
          ? getRelativeTimeString(timeStamp)
          : new Date(timeStamp).toLocaleString()}
      </time>
    </button>
  );
});

TimeDisplay.displayName = "TimeDisplay";
