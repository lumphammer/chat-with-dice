import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { ObstructionSection } from "./ObstructionSection";
import { ProtagonistSection } from "./ProtagonistSection";
import { ResetGameButton } from "./ResetGameButton";
import { StoryDeckSection } from "./StoryDeckSection";
import { TrackersSection } from "./TrackersSection";

/**
 * Play: the story being told. What the table reaches for most goes to the top —
 * the deck and the Obstruction in front of it — and the Protagonist drops to the
 * bottom, where it is read rather than written.
 */
export const PlayView = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  return (
    <>
      <StoryDeckSection />
      <ObstructionSection />
      <TrackersSection />
      <ProtagonistSection />

      <div className="mt-8">
        <ResetGameButton onResetGame={() => capInfo.actions.resetGame({})} />
      </div>
    </>
  );
};
