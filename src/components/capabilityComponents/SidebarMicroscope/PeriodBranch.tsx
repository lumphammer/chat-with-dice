import type { Period } from "#/capabilities/microscope/common";
import { EventBranch } from "./EventBranch";
import { TimelineItemCard } from "./TimelineItemCard";
import { memo } from "react";

/** A Period and everything under it. */
export const PeriodBranch = memo(
  ({ period, bookends }: { period: Period; bookends: ("start" | "end")[] }) => (
    <TimelineItemCard
      kind="period"
      id={period.id}
      tone={period.tone}
      text={period.text}
      bookends={bookends}
      hasChildren={period.events.length > 0}
    >
      {period.events.length > 0 && (
        <ol
          className="border-base-content/20 mt-2 ml-1 flex flex-col gap-2
            border-l pl-2"
        >
          {period.events.map((event) => (
            <li key={event.id}>
              <EventBranch event={event} />
            </li>
          ))}
        </ol>
      )}
    </TimelineItemCard>
  ),
);

PeriodBranch.displayName = "PeriodBranch";
