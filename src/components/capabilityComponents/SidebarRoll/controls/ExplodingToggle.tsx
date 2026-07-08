import { Bomb } from "lucide-react";

type ExplodingToggleProps = {
  value: boolean;
  onChange: (on: boolean) => void;
};

// A boxed feature-switch with an icon, so the boolean reads as an intentional
// "mode on/off" rather than a stray checkbox. Lights up when active to echo the
// primary accent used by the selected toggle buttons.
export const ExplodingToggle = ({ value, onChange }: ExplodingToggleProps) => (
  <label
    className={`rounded-box flex cursor-pointer items-center justify-between
      border px-3 py-2 transition-colors ${
        value
          ? "border-primary bg-primary/10"
          : "border-base-content/10 bg-base-100"
      }`}
  >
    <span className="flex items-center gap-2 text-sm font-medium">
      <Bomb
        className={`h-4 w-4 ${value ? "text-primary" : "text-base-content/50"}`}
      />
      Exploding dice
    </span>
    <input
      type="checkbox"
      className="toggle toggle-primary toggle-sm"
      checked={value}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
);
