import { TRACK_LENGTH } from "#/capabilities/englisheerie/common";
import { DotTracker } from "./DotTracker";

interface Props {
  label: string;
  description: string;
  value: number;
  onSetValue: (value: number) => void;
}

export const TrackerRow = ({
  label,
  description,
  value,
  onSetValue,
}: Props) => (
  <div className="border-base-content/60 rounded-box my-4 border p-3">
    <div className="mb-1 flex items-baseline gap-2">
      <h4 className="grow font-semibold">{label}</h4>
      <span className="text-base-content/50 text-sm tabular-nums">
        {value} / {TRACK_LENGTH}
      </span>
    </div>
    <p className="text-base-content/70 mb-2 text-sm">{description}</p>

    <DotTracker label={label} value={value} onSetValue={onSetValue} />
  </div>
);
