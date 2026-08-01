import { DotTracker } from "./DotTracker";

export const TrackerRow = ({
  label,
  value,
  min,
  onSetValue,
}: {
  label: string;
  value: number;
  /** The floor the track cannot be taken below. Setup's allocation has one. */
  min?: number;
  onSetValue: (value: number) => void;
}) => (
  <div>
    <h4 className="heading">{label}</h4>

    <DotTracker label={label} value={value} min={min} onSetValue={onSetValue} />
  </div>
);
