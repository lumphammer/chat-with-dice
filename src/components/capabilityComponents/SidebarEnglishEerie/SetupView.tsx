import { AllocationSection } from "./AllocationSection";
import { BeginPlayButton } from "./BeginPlayButton";
import { ProtagonistSetupSection } from "./ProtagonistSetupSection";

/**
 * Setup: the sheet being written. The Protagonist is a set of live fields rather
 * than prose, and Spirit and Resolve are one allocation — until a story has been
 * played, at which point they are two spent tracks and setup shows them as such.
 */
export const SetupView = () => {
  return (
    <>
      <ProtagonistSetupSection />
      <AllocationSection />
      <BeginPlayButton />
    </>
  );
};
