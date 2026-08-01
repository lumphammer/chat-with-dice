import { englisheerieClient } from "#/capabilities/englisheerie/client";
import {
  ALLOCATION_TOTAL,
  MIN_ALLOCATION,
} from "#/capabilities/englisheerie/common";
import { TrackerRow } from "./TrackerRow";

/**
 * Spirit and Resolve during setup, where they are not two trackers but one
 * split: ten points between them, so moving either moves the other. The action
 * does the mirroring, so both rows only ever set their own track.
 */
export const AllocationSection = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  const { spirit, resolve } = capInfo.state;
  const { actions } = capInfo;

  return (
    <section className="flex flex-col gap-4">
      <p className="text-base-content/70 mt-1 text-sm">
        Allocate {ALLOCATION_TOTAL} points between spirit and resolve, minimum{" "}
        {MIN_ALLOCATION} in each.
      </p>

      <TrackerRow
        label="Spirit"
        value={spirit}
        min={MIN_ALLOCATION}
        onSetValue={(value) => actions.setTracker({ tracker: "spirit", value })}
      />

      <TrackerRow
        label="Resolve"
        value={resolve}
        min={MIN_ALLOCATION}
        onSetValue={(value) =>
          actions.setTracker({ tracker: "resolve", value })
        }
      />
    </section>
  );
};
