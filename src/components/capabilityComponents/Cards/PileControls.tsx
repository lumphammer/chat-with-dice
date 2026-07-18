import { DwindleStatus } from "./DwindleStatus";
import { memo } from "react";

/**
 * The per-Pile controls under a deck row: the dwindle toggle and, when the Pile
 * is dwindling, the remaining-count readout with Reset. Split out so `DeckRow`
 * stays focused on the deck itself and its Draw action.
 */
export const PileControls = memo(
  ({
    dwindling,
    remaining,
    total,
    onSetReturnCards,
    onReset,
  }: {
    dwindling: boolean;
    remaining: number | null;
    total: number | null;
    onSetReturnCards: (returnCards: boolean) => void;
    onReset: () => void;
  }) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={dwindling}
          onChange={(event) => onSetReturnCards(!event.target.checked)}
        />
        <span>Keep drawn cards out</span>
      </label>
      {dwindling && (
        <DwindleStatus remaining={remaining} total={total} onReset={onReset} />
      )}
    </div>
  ),
);

PileControls.displayName = "PileControls";
