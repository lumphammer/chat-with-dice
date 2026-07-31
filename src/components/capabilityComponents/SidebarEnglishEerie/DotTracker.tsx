import { TRACK_LENGTH } from "#/capabilities/englisheerie/common";
import { useState } from "react";

interface Props {
  label: string;
  value: number;
  onSetValue: (value: number) => void;
}

/**
 * Spirit and Resolve: seven circles, of which the filled ones are the value.
 * The opposite reading to havoc's `ResilienceTracker`, where the crossed-off
 * boxes are the damage and what is left is the value — hence a separate
 * component rather than a flag on that one.
 *
 * Clicking a circle sets the value to its position, so filling and emptying are
 * the same gesture; clicking the last filled circle empties it, which is the
 * only way to reach zero.
 */
export const DotTracker = ({ label, value, onSetValue }: Props) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const previewValue = hovered === null ? value : hovered + 1;

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: TRACK_LENGTH }, (_, index) => {
        const filled = index < value;
        const previewFilled = index < previewValue;
        // Filling this circle would undo the click, so offer to empty it.
        const target = value === index + 1 ? index : index + 1;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSetValue(target)}
            onMouseEnter={() => setHovered(index)}
            aria-label={`Set ${label} to ${target}`}
            className="border-base-content/50 hover:border-base-content flex h-7
              w-7 cursor-pointer items-center justify-center rounded-full border
              transition-colors"
          >
            {(filled || previewFilled) && (
              <span
                className={`h-4 w-4 rounded-full transition-colors ${
                  filled === previewFilled
                    ? "bg-base-content"
                    : "bg-base-content/30"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
