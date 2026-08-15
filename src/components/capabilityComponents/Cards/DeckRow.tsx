import type { Pile } from "#/capabilities/cards/common";
import type { RoomShare } from "#/capabilities/files/common";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { DeckSettingsDialog } from "#/components/FileManager/DeckSettingsDialog";
import { DeckSettingsButton } from "./DeckSettingsButton";
import { DwindleStatus } from "./DwindleStatus";
import { useDeckDrawState } from "./useDeckDrawState";
import { memo, useCallback, useMemo, useState } from "react";

/**
 * One row in the Cards sidebar: a shared Deck's name, its dwindle readout, and
 * its Draw button — plus a settings button into Deck settings when the current
 * user owns the Deck. Kept as its own component so `SidebarCards` only owns
 * mount/loading state and the deck list.
 *
 * The settings button rides with the dwindle readout when there is one, and sits
 * up on the name row when there is not — on a Deck that returns its Cards it
 * would otherwise be marooned on a row of its own. The dialog is rendered here
 * rather than inside the button so that moving the button between rows cannot
 * destroy an open dialog.
 *
 * Whether the Deck dwindles is the Deck's own rule and lives in the owner's file
 * store, so it arrives by fetch ({@link useDeckDrawState}) rather than from room
 * state. A Deck with no `pile` yet simply has an empty Discard.
 */
export const DeckRow = memo(
  ({
    deck,
    pile,
    roomId,
    isOwner,
    onDraw,
    onReset,
  }: {
    deck: RoomShare;
    pile: Pile | undefined;
    roomId: string;
    isOwner: boolean;
    onDraw: () => void;
    onReset: () => void;
  }) => {
    const { openSharedFolder } = useRoomUiNavigationContext();
    const discard = useMemo(() => pile?.discard ?? [], [pile]);
    const discardKey = discard.join(",");
    // Bumped when the owner closes Deck settings, so a change to the draw rule
    // shows up straight away instead of at the next draw.
    const [refreshKey, setRefreshKey] = useState(0);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const { drawToDiscardPile, remaining, total } = useDeckDrawState({
      ownerUserId: deck.userId,
      deckNodeId: deck.node.id,
      roomId,
      discard,
      discardKey,
      refreshKey,
    });

    // `null` means the rule is not known yet, which counts as not dwindling: the
    // row shows no readout rather than one it might have to retract.
    const dwindling = drawToDiscardPile === true;

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

    const handleOpenSettings = useCallback(() => {
      setSettingsOpen(true);
    }, []);

    const handleSettingsClosed = useCallback(() => {
      setSettingsOpen(false);
      setRefreshKey((key) => key + 1);
    }, []);

    const settingsButton = isOwner ? (
      <DeckSettingsButton name={deck.node.name} onOpen={handleOpenSettings} />
    ) : null;

    return (
      <li className="surface flex flex-col gap-2 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="heading link link-hover w-auto min-w-0 truncate
              font-medium"
            title="Browse this deck's cards in Shared with room"
            onClick={handleOpenFolder}
          >
            {deck.node.name}
          </button>
          {/* No readout to sit beside, so the settings button comes up here
              rather than holding a row on its own. */}
          {!dwindling && settingsButton}
        </div>
        {dwindling && (
          <div className="flex items-center gap-2">
            <DwindleStatus
              remaining={remaining}
              total={total}
              onReset={onReset}
            />
            {/* `ml-auto` rather than `justify-between`, so the button sits right
                even before the readout has its counts. */}
            {settingsButton && <div className="ml-auto">{settingsButton}</div>}
          </div>
        )}
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={onDraw}
          disabled={drawDisabled}
        >
          Draw
        </button>
        {isOwner && (
          <DeckSettingsDialog
            nodeId={deck.node.id}
            name={deck.node.name}
            open={settingsOpen}
            onClose={handleSettingsClosed}
          />
        )}
      </li>
    );
  },
);

DeckRow.displayName = "DeckRow";
