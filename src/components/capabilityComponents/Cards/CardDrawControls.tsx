import { memo } from "react";

type CardDrawControlsProps = {
  faceDown: boolean;
  hasBack: boolean;
  inverted: boolean;
  onSetFaceDown: (faceDown: boolean) => void;
  onSetInverted: (inverted: boolean) => void;
};

export const CardDrawControls = memo(
  ({
    faceDown,
    hasBack,
    inverted,
    onSetFaceDown,
    onSetInverted,
  }: CardDrawControlsProps) => (
    <div className="mt-1 flex flex-wrap gap-2 text-sm">
      {hasBack && (
        <>
          {/*{faceDown ? "Face down" : "Face up"}*/}
          <button
            type="button"
            aria-label={`Turn card face ${faceDown ? "up" : "down"}`}
            aria-pressed={faceDown}
            className="link"
            onClick={() => onSetFaceDown(!faceDown)}
          >
            {faceDown ? "Flip to front" : "Flip to back"}
          </button>
        </>
      )}
      {/*{inverted ? "Inverted" : "Upright"}*/}
      <button
        type="button"
        aria-label={inverted ? "Turn card upright" : "Invert card"}
        aria-pressed={inverted}
        className="link"
        onClick={() => onSetInverted(!inverted)}
      >
        {inverted ? "Turn upright" : "Invert"}
      </button>
    </div>
  ),
);

CardDrawControls.displayName = "CardDrawControls";
