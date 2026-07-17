import { cardsClient } from "#/capabilities/cards/client";
import { filesClient } from "#/capabilities/files/client";
import type { RoomShare } from "#/capabilities/files/common";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { Layers } from "lucide-react";
import { memo, useMemo } from "react";

/**
 * A Deck currently shared with the room: a Room Share whose node is a folder
 * marked as a Deck and is still viewable (not binned by the owner).
 */
const isDrawableDeck = (share: RoomShare) =>
  !share.unavailable && share.node.kind === "folder" && share.node.isDeck;

export const SidebarCards = memo(() => {
  const filesCap = filesClient.useMount();
  const cardsCap = cardsClient.useMount();

  const decks = useMemo(() => {
    if (!filesCap.initialised) return [];
    return filesCap.state.shares
      .filter(isDrawableDeck)
      .sort((a, b) => b.dateShared - a.dateShared);
  }, [filesCap]);

  if (!cardsCap.initialised) {
    return "Loading...";
  }

  // The Cards sidebar reads its Deck list from the Files capability's shares, so
  // a room with Cards wants Files too. Until Files has loaded there is nothing
  // to list.
  if (!filesCap.initialised) {
    return (
      <SidebarPanel title="Cards" isSaving={false}>
        <div className="animate-fadein-slow flex flex-col gap-2 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-lg" />
          ))}
        </div>
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel title="Cards" isSaving={false}>
      {decks.length === 0 ? (
        <div className="text-base-content/60 flex min-h-32 items-center pt-2">
          No decks are shared with this room yet. Share a deck folder from the
          Files panel to draw from it.
        </div>
      ) : (
        <ul className="animate-fadein mt-2 flex min-w-0 flex-col gap-1">
          {decks.map((deck) => (
            <li
              key={deck.node.id}
              className="border-base-300 bg-base-100 rounded-box flex
                items-center gap-3 border px-3 py-2"
            >
              <span
                className="bg-base-200 flex size-10 shrink-0 items-center
                  justify-center rounded"
              >
                <Layers size={20} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {deck.node.name}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  cardsCap.actions.draw({
                    ownerUserId: deck.userId,
                    deckNodeId: deck.node.id,
                    deckName: deck.node.name,
                  })
                }
              >
                Draw
              </button>
            </li>
          ))}
        </ul>
      )}
    </SidebarPanel>
  );
});

SidebarCards.displayName = "SidebarCards";
