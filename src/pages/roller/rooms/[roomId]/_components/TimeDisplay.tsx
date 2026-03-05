import { memo, useState } from "react";

type TimeDisplayProps = {
  timeStamp: number;
};

const ISO_CORE_PART_LENGTH = 19;
const MS_PER_SECOND = 1000;

const SECONDS_PER_MINUTE = 60;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_WEEK = DAYS_PER_WEEK * SECONDS_PER_DAY;
const SECONDS_PER_MONTH = DAYS_PER_MONTH * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = DAYS_PER_YEAR * SECONDS_PER_DAY;

/**
 * Convert a date to a relative time string, such as
 * "a minute ago", "in 2 hours", "yesterday", "3 months ago", etc.
 * using Intl.RelativeTimeFormat
 */
export function getRelativeTimeString(
  date: Date | number,
  lang = navigator.language,
): string {
  // Allow dates or times to be passed
  const timeMs = typeof date === "number" ? date : date.getTime();

  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / MS_PER_SECOND);

  // Array reprsenting one minute, hour, day, week, month, etc in seconds
  const cutoffs = [
    SECONDS_PER_MINUTE,
    SECONDS_PER_HOUR,
    SECONDS_PER_DAY,
    SECONDS_PER_WEEK,
    SECONDS_PER_MONTH,
    SECONDS_PER_YEAR,
    Infinity,
  ];

  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = [
    "second",
    "minute",
    "hour",
    "day",
    "week",
    "month",
    "year",
  ];

  // Grab the ideal cutoff unit
  const unitIndex = cutoffs.findIndex(
    (cutoff) => cutoff > Math.abs(deltaSeconds),
  );

  // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
  // is one day in seconds, so we can divide our seconds by this to get the # of days
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);
}

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
