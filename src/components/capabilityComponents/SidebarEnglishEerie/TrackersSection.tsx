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
        description="What the story leaves you. Empty a circle as the table decides."
        value={spirit}
        onSetValue={(value) => actions.setTracker({ tracker: "spirit", value })}
      />

      <TrackerRow
        label="Resolve"
        description="Spent on obstruction rolls — before the roll, or after it."
        value={resolve}
        onSetValue={(value) =>
          actions.setTracker({ tracker: "resolve", value })
        }
      />
    </section>
  );
};
