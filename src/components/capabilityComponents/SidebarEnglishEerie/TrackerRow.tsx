import {
  MAX_TRACKER_MAX,
  type Tracker,
} from "#/capabilities/englisheerie/common";
import { ResilienceTracker } from "#/components/capabilityComponents/shared/ResilienceTracker";
import { MinusIcon, PlusIcon } from "lucide-react";

interface Props {
  label: string;
  description: string;
  tracker: Tracker;
  onSetCurrent: (current: number) => void;
  onSetMax: (max: number) => void;
}

export const TrackerRow = ({
  label,
  description,
  tracker,
  onSetCurrent,
  onSetMax,
}: Props) => (
  <div className="border-base-content/60 rounded-box my-4 border p-3">
    <div className="mb-1 flex items-baseline gap-2">
      <h4 className="grow font-semibold">{label}</h4>
      <span className="text-base-content/50 text-sm tabular-nums">
        {tracker.current} / {tracker.max}
      </span>
    </div>
    <p className="text-base-content/70 mb-2 text-sm">{description}</p>

    <ResilienceTracker
      startingResilience={tracker.max}
      resilience={tracker.current}
      onSetResilience={onSetCurrent}
    />

    <div className="mt-2 flex items-center gap-1">
      <span className="text-base-content/50 mr-1 text-xs">Track length</span>
      <button
        type="button"
        className="btn btn-xs btn-ghost"
        disabled={tracker.max <= 1}
        onClick={() => onSetMax(tracker.max - 1)}
        aria-label={`Shorten the ${label} track`}
      >
        <MinusIcon className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="btn btn-xs btn-ghost"
        disabled={tracker.max >= MAX_TRACKER_MAX}
        onClick={() => onSetMax(tracker.max + 1)}
        aria-label={`Lengthen the ${label} track`}
      >
        <PlusIcon className="h-3 w-3" />
      </button>
    </div>
  </div>
);
