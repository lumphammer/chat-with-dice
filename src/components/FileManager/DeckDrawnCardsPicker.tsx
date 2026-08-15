import { memo, useId } from "react";

// The two rules a Deck can follow, most-common first. Each carries the copy the
// radio list shows. Drawing to the Discard is the default, so it leads.
const OPTIONS: { value: boolean; label: string; description: string }[] = [
  {
    value: true,
    label: "Draw to discard pile",
    description: "Cards go to the discard pile until the deck is reset",
  },
  {
    value: false,
    label: "Return cards to deck",
    description: "All cards remain drawable",
  },
];

/**
 * The "drawn cards" control of the Deck settings dialog: a radio list of the two
 * rules a Deck can follow once a Card has been drawn. Broken out so
 * {@link DeckSettingsDialog} keeps to load/mutation state rather than markup.
 * Each option's description is tied to its radio with `aria-describedby` so
 * assistive tech announces it alongside the choice.
 */
export const DeckDrawnCardsPicker = memo(
  ({
    drawToDiscardPile,
    disabled,
    onChange,
  }: {
    drawToDiscardPile: boolean;
    disabled: boolean;
    onChange: (next: boolean) => void;
  }) => {
    const groupId = useId();
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium">Drawn cards</span>
        <span className="muted">What happens to a card after it is drawn.</span>
        <div className="mt-2 flex flex-col gap-1">
          {OPTIONS.map((option) => {
            const key = String(option.value);
            const labelId = `${groupId}-${key}-label`;
            const descriptionId = `${groupId}-${key}-description`;
            return (
              // The whole row is the label so clicking the description selects
              // the option too. aria-labelledby keeps the radio's accessible name
              // to just the option label (not the description), which is tied on
              // with aria-describedby. The grid keeps both spans direct children
              // of the label so the linter still recognises the label text.
              <label
                key={key}
                className="hover:bg-base-200 grid cursor-pointer
                  grid-cols-[auto_1fr] items-start gap-x-3 rounded-lg p-2"
              >
                <input
                  type="radio"
                  name={groupId}
                  className="radio radio-primary row-span-2 mt-1 shrink-0"
                  checked={drawToDiscardPile === option.value}
                  disabled={disabled}
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                  onChange={() => onChange(option.value)}
                />
                <span id={labelId}>{option.label}</span>
                <span id={descriptionId} className="muted">
                  {option.description}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  },
);

DeckDrawnCardsPicker.displayName = "DeckDrawnCardsPicker";
