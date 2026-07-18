import type { Pile } from "#/capabilities/cards/common";
import type { RoomShare } from "#/capabilities/files/common";
import { DwindleStatus } from "./DwindleStatus";
import { Layers } from "lucide-react";
import { memo, useMemo } from "react";

/**
 * One row in the Cards sidebar: a shared Deck, its Draw button, and its Pile
 * controls. Kept as its own component so `SidebarCards` only owns mount/loading
 * state and the deck list.
 *
 * A Deck with no `pile` yet is a fresh, non-dwindling Pile: Cards return after
 * every draw and there is no Discard.
 */
export const DeckRow = memo(
  ({
    deck,
    pile,
    roomId,
    onDraw,
    onSetReturnCards,
    onReset,
  }: {
    deck: RoomShare;
    pile: Pile | undefined;
    roomId: string;
    onDraw: () => void;
    onSetReturnCards: (returnCards: boolean) => void;
    onReset: () => void;
  }) => {
    const returnCards = pile?.returnCards ?? true;
    const discard = useMemo(() => pile?.discard ?? [], [pile]);
    const discardKey = discard.join(",");

    return (
      <li
        className="border-base-300 bg-base-100 rounded-box flex flex-col gap-2
          border px-3 py-2"
      >
        <div className="flex items-center gap-3">
          <span
            className="bg-base-200 flex size-10 shrink-0 items-center
              justify-center rounded"
          >
            <Layers size={20} />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {deck.node.name}
          </span>
          <button type="button" className="btn btn-primary" onClick={onDraw}>
            Draw
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={!returnCards}
              onChange={(event) => onSetReturnCards(!event.target.checked)}
            />
            <span>Keep drawn cards out</span>
          </label>
          {!returnCards && (
            <DwindleStatus
              ownerUserId={deck.userId}
              deckNodeId={deck.node.id}
              roomId={roomId}
              discard={discard}
              discardKey={discardKey}
              onReset={onReset}
            />
          )}
        </div>
      </li>
    );
  },
);

DeckRow.displayName = "DeckRow";
