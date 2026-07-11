// A boxed feature-switch with an icon, so the boolean reads as an intentional
// "mode on/off" rather than a stray checkbox. Lights up when active to echo the
// primary accent used by the selected toggle buttons.
export const ExplodingToggle = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (on: boolean) => void;
}) => (
  <label
    className={`btn btn-sm items-center justify-start gap-4 transition-colors
      ${value ? "btn-primary" : "btn-neutral"}`}
  >
    <input
      type="checkbox"
      className="toggle toggle-primary toggle-sm"
      checked={value}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="flex items-center gap-2 text-sm font-medium">
      Exploding dice
    </span>
  </label>
);
