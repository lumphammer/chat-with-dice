import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { ProtagonistSection } from "./ProtagonistSection";
import { StoryDeckSection } from "./StoryDeckSection";
import { TrackersSection } from "./TrackersSection";

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
      <TrackersSection />
      <ProtagonistSection />
    </>
  );
};
