import { cardsClient } from "#/capabilities/cards/client";
import { findPile } from "#/capabilities/cards/common";
import { filesClient } from "#/capabilities/files/client";
import type { RoomShare } from "#/capabilities/files/common";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { DeckRow } from "./DeckRow";
import { memo, useMemo } from "react";

/**
 * A Deck currently shared with the room: a Room Share whose node is a folder
 * marked as a Deck and is still viewable (not binned by the owner).
 */
const isDrawableDeck = (share: RoomShare) =>
  !share.unavailable && share.node.kind === "folder" && share.node.isDeck;

export const SidebarCards = memo(() => {
  const { roomId } = useRoomInfoContext();
  const closeMobileSidebar = useCloseMobileSidebar();
  const filesCap = filesClient.useMount();
  const cardsCap = cardsClient.useMount();

  const decks = useMemo(() => {
    if (!filesCap.initialised) return [];
    return filesCap.state.shares
      .filter(isDrawableDeck)
      .sort((a, b) => a.node.name.localeCompare(b.node.name));
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
            <DeckRow
              key={deck.node.id}
              deck={deck}
              pile={findPile(cardsCap.state, deck.userId, deck.node.id)}
              roomId={roomId}
              onDraw={() => {
                cardsCap.actions.draw({
                  ownerUserId: deck.userId,
                  deckNodeId: deck.node.id,
                });
                closeMobileSidebar();
              }}
              onSetReturnCards={(returnCards) =>
                cardsCap.actions.setReturnCards({
                  ownerUserId: deck.userId,
                  deckNodeId: deck.node.id,
                  returnCards,
                })
              }
              onReset={() =>
                cardsCap.actions.reset({
                  ownerUserId: deck.userId,
                  deckNodeId: deck.node.id,
                })
              }
            />
          ))}
        </ul>
      )}
    </SidebarPanel>
  );
});

SidebarCards.displayName = "SidebarCards";
