import { DIE_CHOICES } from "#/capabilities/roll/common";

type DieSizeToggleProps = {
  value: string;
  onChange: (label: string) => void;
};

// Segmented row for all eight die sizes on one line. The leading "d" is shown
// once as a prefix and dropped from each button (4…100) so the row fits the
// sidebar; smaller buttons than the operator row for the same reason.
export const DieSizeToggle = ({ value, onChange }: DieSizeToggleProps) => (
  <div className="flex items-center gap-2">
    <span className="text-base-content/40 font-mono text-lg font-bold">d</span>
    <fieldset
      className="join m-0 min-w-0 flex-1 border-0 p-0"
      aria-label="Die size"
    >
      {DIE_CHOICES.map((choice) => (
        <button
          key={choice.label}
          type="button"
          onClick={() => onChange(choice.label)}
          className={`btn btn-sm join-item min-w-0 flex-1 px-1 text-sm ${
            choice.label === value ? "btn-primary" : "btn-neutral"
          }`}
          aria-pressed={choice.label === value}
          aria-label={choice.label}
        >
          {choice.label.slice(1)}
        </button>
      ))}
    </fieldset>
  </div>
);
