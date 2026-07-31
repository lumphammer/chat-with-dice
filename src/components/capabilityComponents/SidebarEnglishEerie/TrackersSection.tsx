import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { TrackerRow } from "./TrackerRow";

export const TrackersSection = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  const { spirit, resolve } = capInfo.state;
  const { actions } = capInfo;

  return (
    <section className="mt-8">
      <h3 className="heading">Spirit &amp; Resolve</h3>

      <TrackerRow
        label="Spirit"
        description="What the story costs you. Cross a box off as the table decides."
        tracker={spirit}
        onSetCurrent={(current) =>
          actions.setTracker({ tracker: "spirit", current })
        }
        onSetMax={(max) => actions.setTrackerMax({ tracker: "spirit", max })}
      />

      <TrackerRow
        label="Resolve"
        description="Spent on obstruction rolls — before the roll, or after it."
        tracker={resolve}
        onSetCurrent={(current) =>
          actions.setTracker({ tracker: "resolve", current })
        }
        onSetMax={(max) => actions.setTrackerMax({ tracker: "resolve", max })}
      />
    </section>
  );
};
