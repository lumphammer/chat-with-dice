import type { InvertedDraws } from "#/schemas/invertedDraws";
import { memo, useId } from "react";

// The three options in the order they escalate: off, fronts, then fronts and
// backs. Each carries the copy the radio list shows. "Inverted" is the project
// term — CONTEXT.md lists "reversed" as a term to avoid.
const OPTIONS: { value: InvertedDraws; label: string; description: string }[] =
  [
    {
      value: "none",
      label: "Never",
      description: "Cards are never drawn inverted.",
    },
    {
      value: "fronts",
      label: "Fronts only",
      description:
        "Cards drawn face up can come up rotated 180° at random. Face-down cards stay upright.",
    },
    {
      value: "fronts-and-backs",
      label: "Fronts and backs",
      description:
        "Any draw can come up rotated 180° at random, including a face-down card, which shows its back rotated.",
    },
  ];

/**
 * The "inverted draws" control of the Deck settings dialog: a radio list of the
 * three states a Deck's {@link InvertedDraws} setting can take. Broken out so
 * {@link DeckSettingsDialog} keeps to load/mutation state rather than markup.
 * Each option's description is tied to its radio with `aria-describedby` so
 * assistive tech announces it alongside the choice.
 */
export const DeckInvertedPicker = memo(
  ({
    invertedDraws,
    disabled,
    onChange,
  }: {
    invertedDraws: InvertedDraws;
    disabled: boolean;
    onChange: (next: InvertedDraws) => void;
  }) => {
    const groupId = useId();
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium">Inverted draws</span>
        <span className="text-base-content/60">
          Whether cards can be turned around 180° on the table when drawn.
        </span>
        <div className="mt-2 flex flex-col gap-1">
          {OPTIONS.map((option) => {
            const descriptionId = `${groupId}-${option.value}`;
            return (
              <div
                key={option.value}
                className="hover:bg-base-200 rounded-lg p-2"
              >
                {/* The description sits outside the label — as elsewhere in
                    this dialog — so the label's accessible text stays at a depth
                    assistive tech and the linter recognise, and is tied back
                    with aria-describedby. */}
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name={groupId}
                    className="radio radio-primary shrink-0"
                    checked={invertedDraws === option.value}
                    disabled={disabled}
                    aria-describedby={descriptionId}
                    onChange={() => onChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
                <span
                  id={descriptionId}
                  className="text-base-content/60 block ps-8"
                >
                  {option.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

DeckInvertedPicker.displayName = "DeckInvertedPicker";
