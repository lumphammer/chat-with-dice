import { englisheerieClient } from "#/capabilities/englisheerie/client";
import {
  ALLOCATION_TOTAL,
  MIN_ALLOCATION,
  TRACK_LENGTH,
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
    <section className="mt-8">
      <h3 className="heading">Spirit &amp; Resolve</h3>
      <p className="text-base-content/70 mt-1 text-sm">
        {ALLOCATION_TOTAL} points between the two, no fewer than{" "}
        {MIN_ALLOCATION} and no more than {TRACK_LENGTH} on either. Move one and
        the other moves to meet it.
      </p>

      <TrackerRow
        label="Spirit"
        description="How much the story can take before there is nothing left to take."
        value={spirit}
        min={MIN_ALLOCATION}
        onSetValue={(value) => actions.setTracker({ tracker: "spirit", value })}
      />

      <TrackerRow
        label="Resolve"
        description="The nerve there is to spend on obstructions."
        value={resolve}
        min={MIN_ALLOCATION}
        onSetValue={(value) =>
          actions.setTracker({ tracker: "resolve", value })
        }
      />
    </section>
  );
};
