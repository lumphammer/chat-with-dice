import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { ObstructionRollControls } from "./ObstructionRollControls";

export const ObstructionSection = () => {
  const capInfo = englisheerieClient.useMount();
  const closeMobileSidebar = useCloseMobileSidebar();

  if (!capInfo.initialised) {
    return null;
  }

  const { lastObstruction } = capInfo.state;

  if (!lastObstruction) {
    return (
      <section className="mt-8">
        <h3 className="heading">The Obstruction</h3>
        <p className="muted mt-1 text-sm">
          Nothing to beat yet. Draw a card that obstructs and its difficulty
          lands here.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h3 className="heading">The Obstruction</h3>
      <ObstructionRollControls
        difficulty={lastObstruction.difficulty}
        onRoll={closeMobileSidebar}
      />
    </section>
  );
};
