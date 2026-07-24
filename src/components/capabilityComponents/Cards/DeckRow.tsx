import type { Pile } from "#/capabilities/cards/common";
import type { RoomShare } from "#/capabilities/files/common";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { PileControls } from "./PileControls";
import { useRemainingCards } from "./useRemainingCards";
import { Layers } from "lucide-react";
import { memo, useCallback, useMemo } from "react";

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
    const { openSharedFolder } = useRoomUiNavigationContext();
    const dwindling = pile ? !pile.returnCards : false;
    const discard = useMemo(() => pile?.discard ?? [], [pile]);
    const discardKey = discard.join(",");

    const { remaining, total } = useRemainingCards({
      ownerUserId: deck.userId,
      deckNodeId: deck.node.id,
      roomId,
      discard,
      discardKey,
      enabled: dwindling,
    });

    // A fully-drawn dwindling Pile can't be drawn from until Reset, so the Draw
    // button is disabled rather than letting the click surface an error. While
    // the count is still loading (`remaining` null) the button stays enabled and
    // the server-side guard remains the backstop for the race.
    const drawDisabled = dwindling && remaining === 0;

    const handleOpenFolder = useCallback(() => {
      openSharedFolder({
        ownerUserId: deck.userId,
        folderId: deck.node.id,
        folderName: deck.node.name,
      });
    }, [deck.node.id, deck.node.name, deck.userId, openSharedFolder]);

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
          <button
            type="button"
            className="link link-hover min-w-0 flex-1 truncate text-left
              font-medium"
            title="Browse this deck's cards in Shared with room"
            onClick={handleOpenFolder}
          >
            {deck.node.name}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onDraw}
            disabled={drawDisabled}
          >
            Draw
          </button>
        </div>
        <PileControls
          dwindling={dwindling}
          remaining={remaining}
          total={total}
          onSetReturnCards={onSetReturnCards}
          onReset={onReset}
        />
      </li>
    );
  },
);

DeckRow.displayName = "DeckRow";
