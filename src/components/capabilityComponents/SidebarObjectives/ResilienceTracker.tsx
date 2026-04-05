import { RotateCcwIcon, XIcon } from "lucide-react";
import { useState } from "react";

interface ResilienceBoxProps {
  isCrossed: boolean;
  previewCrossed: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const ResilienceBox = ({
  isCrossed,
  previewCrossed,
  onClick,
  onMouseEnter,
}: ResilienceBoxProps) => {
  const showX = isCrossed || previewCrossed;
  const isPreview = isCrossed !== previewCrossed;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="border-base-content/50 hover:border-base-content flex h-7 w-7
        cursor-pointer items-center justify-center rounded border
        transition-colors"
    >
      {showX && (
        <XIcon
          className={`h-4 w-4 transition-colors ${
            isPreview ? "text-base-content/30" : "text-base-content"
          }`}
        />
      )}
    </button>
  );
};

interface ResilienceTrackerProps {
  startingResilience: number;
  resilience: number;
  onSetResilience: (resilience: number) => void;
}

export const ResilienceTracker = ({
  startingResilience,
  resilience,
  onSetResilience,
}: ResilienceTrackerProps) => {
  const [hoveredTarget, setHoveredTarget] = useState<number | "reset" | null>(
    null,
  );

  const crossedCount = startingResilience - resilience;
  const isAtFullResilience = crossedCount === 0;

  const previewCrossedCount =
    hoveredTarget === null
      ? crossedCount
      : hoveredTarget === "reset"
        ? 0
        : hoveredTarget + 1;

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      onMouseLeave={() => setHoveredTarget(null)}
    >
      <button
        type="button"
        disabled={isAtFullResilience}
        onClick={() => onSetResilience(startingResilience)}
        onMouseEnter={() => setHoveredTarget("reset")}
        className={`flex h-7 w-7 cursor-pointer items-center justify-center
          rounded transition-colors ${
            isAtFullResilience
              ? "text-base-content/20 cursor-default"
              : "text-base-content/50 hover:text-base-content"
          }`}
      >
        <RotateCcwIcon className="h-4 w-4" />
      </button>

      <div className="relative flex flex-wrap gap-1">
        {Array.from({ length: startingResilience }, (_, i) => {
          const isCrossed = i < crossedCount;
          const previewCrossed = i < previewCrossedCount;

          return (
            <ResilienceBox
              key={i}
              isCrossed={isCrossed}
              previewCrossed={previewCrossed}
              onClick={() => onSetResilience(startingResilience - (i + 1))}
              onMouseEnter={() => setHoveredTarget(i)}
            />
          );
        })}
        {resilience <= 0 && (
          <svg
            className="text-accent/60 pointer-events-none absolute inset-0
              h-full w-full"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="0"
              x2="100%"
              y2="100%"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="100%"
              y1="0"
              x2="0"
              y2="100%"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
