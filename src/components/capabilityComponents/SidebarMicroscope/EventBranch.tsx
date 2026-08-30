import type { TimelineEvent } from "#/capabilities/microscope/common";
import { TimelineItemCard } from "./TimelineItemCard";
import { memo } from "react";

/** An Event and the Scenes under it. */
export const EventBranch = memo(({ event }: { event: TimelineEvent }) => (
  <TimelineItemCard
    kind="event"
    id={event.id}
    tone={event.tone}
    text={event.text}
    hasChildren={event.scenes.length > 0}
  >
    {event.scenes.length > 0 && (
      <ol
        className="border-base-content/20 mt-2 ml-1 flex flex-col gap-2 border-l
          pl-2"
      >
        {event.scenes.map((scene) => (
          <li key={scene.id}>
            <TimelineItemCard
              kind="scene"
              id={scene.id}
              tone={scene.tone}
              text={scene.question}
              answer={scene.answer}
            />
          </li>
        ))}
      </ol>
    )}
  </TimelineItemCard>
));

EventBranch.displayName = "EventBranch";
