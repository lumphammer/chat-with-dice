import { THEME_NAMES, themes } from "#/styles/themes/registry";
import { useRoomInfoContext } from "../DiceRoller/contexts/roomInfoContext";
import { memo, useId } from "react";

/**
 * Room theme picker. Applies live for everyone in the room: the DO persists the
 * choice and broadcasts it, and every client swaps the attribute on `<html>`.
 * Every theme's CSS is already loaded, so there's nothing to wait for and no
 * preview mode to build — picking one *is* the preview.
 */
export const ThemePicker = memo(() => {
  const groupName = useId();
  const { roomTheme, setRoomTheme } = useRoomInfoContext();

  return (
    <fieldset className="mt-4 border-0 p-0">
      <legend className="mb-2 block text-xl font-medium">Theme</legend>
      <ul className="space-y-3">
        {THEME_NAMES.map((name) => {
          const { label, description } = themes[name];
          const isSelected = name === roomTheme;

          return (
            <li key={name}>
              {/* the two text spans are direct children of the label so it is
              accessibly named; the radio spans both grid rows to stay centred
              against them */}
              <label
                className="border-base-300 bg-base-100 rounded-box
                  has-checked:border-primary grid cursor-pointer
                  grid-cols-[auto_1fr] items-start gap-x-3 border px-4 py-3
                  shadow-sm"
              >
                <input
                  type="radio"
                  name={groupName}
                  className="radio radio-primary row-span-2 mt-1"
                  value={name}
                  checked={isSelected}
                  onChange={() => setRoomTheme(name)}
                />
                <span className="font-medium">{label}</span>
                <span className="muted text-sm">{description}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
});

ThemePicker.displayName = "ThemePicker";
