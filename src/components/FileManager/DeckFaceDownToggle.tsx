import { memo } from "react";

/**
 * The "allow face-down draws" control of the Deck settings dialog. Broken out so
 * {@link DeckSettingsDialog} keeps to load/mutation state rather than markup.
 * The description sits outside the label so the label's accessible text stays at
 * a depth assistive tech and the linter recognise.
 */
export const DeckFaceDownToggle = memo(
  ({
    allowFaceDown,
    disabled,
    onChange,
  }: {
    allowFaceDown: boolean;
    disabled: boolean;
    onChange: (next: boolean) => void;
  }) => {
    return (
      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={allowFaceDown}
            disabled={disabled}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
          <span className="font-medium">Allow face-down draws</span>
        </label>
        <span className="text-base-content/60">
          Cards with a back can come up face down at random.
        </span>
      </div>
    );
  },
);

DeckFaceDownToggle.displayName = "DeckFaceDownToggle";
