import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { ObstructionSection } from "./ObstructionSection";
import { ProtagonistSection } from "./ProtagonistSection";
import { ResetGameButton } from "./ResetGameButton";
import { StoryDeckSection } from "./StoryDeckSection";
import { TrackersSection } from "./TrackersSection";

// Keep the old location easy to restore while the chat-message UI is tried out.
const SHOW_OBSTRUCTION_IN_SIDEBAR = false;

/**
 * Play: the story being told. What the table reaches for most goes to the top —
 * the deck, then the trackers — and the Protagonist drops to the bottom, where
 * it is read rather than written. Obstruction rolls live with the active card
 * in chat while the sidebar version is being reconsidered.
 */
export const PlayView = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  return (
    <>
      <StoryDeckSection />
      {SHOW_OBSTRUCTION_IN_SIDEBAR && <ObstructionSection />}
      <TrackersSection />
      <ProtagonistSection />

      <div className="mt-8">
        <ResetGameButton onResetGame={() => capInfo.actions.resetGame({})} />
      </div>
    </>
  );
};
