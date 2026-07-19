import { memo } from "react";

/**
 * The "allow inverted draws" control of the Deck settings dialog. Broken out so
 * {@link DeckSettingsDialog} keeps to load/mutation state rather than markup.
 * The description sits outside the label so the label's accessible text stays at
 * a depth assistive tech and the linter recognise.
 */
export const DeckInvertedToggle = memo(
  ({
    allowInverted,
    disabled,
    onChange,
  }: {
    allowInverted: boolean;
    disabled: boolean;
    onChange: (next: boolean) => void;
  }) => {
    return (
      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={allowInverted}
            disabled={disabled}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
          <span className="font-medium">Allow inverted draws</span>
        </label>
        <span className="text-base-content/60">
          Cards can come up rotated 180° (reversed) at random.
        </span>
      </div>
    );
  },
);

DeckInvertedToggle.displayName = "DeckInvertedToggle";
