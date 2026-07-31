import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { isAllocating } from "#/capabilities/englisheerie/common";
import { AllocationSection } from "./AllocationSection";
import { BeginPlayButton } from "./BeginPlayButton";
import { ProtagonistSetupSection } from "./ProtagonistSetupSection";
import { TrackersSection } from "./TrackersSection";

/**
 * Setup: the sheet being written. The Protagonist is a set of live fields rather
 * than prose, and Spirit and Resolve are one allocation — until a story has been
 * played, at which point they are two spent tracks and setup shows them as such.
 */
export const SetupView = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  const { stack, drawn } = capInfo.state;
  const hasStoryInProgress = stack.length > 0 || drawn.length > 0;

  return (
    <>
      <ProtagonistSetupSection />
      {isAllocating(capInfo.state) ? (
        <AllocationSection />
      ) : (
        <TrackersSection />
      )}

      <div className="mt-8">
        <BeginPlayButton
          hasStoryInProgress={hasStoryInProgress}
          onBeginPlay={() => capInfo.actions.beginPlay({})}
        />
      </div>
    </>
  );
};
