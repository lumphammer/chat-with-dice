import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { DotTracker } from "./DotTracker";

export const TrackersSection = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  const { spirit, resolve } = capInfo.state;
  const { actions } = capInfo;

  return (
    <section className="mt-8 flex flex-col gap-4">
      <div>
        <h3 className="heading mb-2">Spirit</h3>
        <DotTracker
          label="Spirit"
          value={spirit}
          onSetValue={(value) =>
            actions.setTracker({ tracker: "spirit", value })
          }
        />
      </div>

      <div>
        <h3 className="heading mb-2">Resolve</h3>
        <DotTracker
          label="Resolve"
          value={resolve}
          onSetValue={(value) =>
            actions.setTracker({ tracker: "resolve", value })
          }
        />
      </div>
    </section>
  );
};
