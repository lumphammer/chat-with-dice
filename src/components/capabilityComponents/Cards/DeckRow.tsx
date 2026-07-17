import type { RoomShare } from "#/capabilities/files/common";
import { Layers } from "lucide-react";
import { memo } from "react";

/**
 * One row in the Cards sidebar: a shared Deck and its Draw button. Kept as its
 * own component so `SidebarCards` only owns mount/loading state and the deck
 * list.
 */
export const DeckRow = memo(
  ({ deck, onDraw }: { deck: RoomShare; onDraw: () => void }) => (
    <li
      className="border-base-300 bg-base-100 rounded-box flex items-center gap-3
        border px-3 py-2"
    >
      <span
        className="bg-base-200 flex size-10 shrink-0 items-center justify-center
          rounded"
      >
        <Layers size={20} />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {deck.node.name}
      </span>
      <button type="button" className="btn btn-primary" onClick={onDraw}>
        Draw
      </button>
    </li>
  ),
);

DeckRow.displayName = "DeckRow";
