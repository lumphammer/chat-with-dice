import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { GREY_LADY_COUNT } from "#/capabilities/englisheerie/common";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { SetUpDeckButton } from "./SetUpDeckButton";
import { formatCardsRemaining } from "./formatCardsRemaining";
import { LayersIcon } from "lucide-react";

export const StoryDeckSection = () => {
  const capInfo = englisheerieClient.useMount();
  const closeMobileSidebar = useCloseMobileSidebar();

  if (!capInfo.initialised) {
    return null;
  }

  const { stack, drawn } = capInfo.state;
  const { actions } = capInfo;
  const hasStoryInProgress = stack.length > 0 || drawn.length > 0;
  const greyLadiesDrawn = drawn.filter(
    (card) => card.kind === "greyLady",
  ).length;

  return (
    <section className="mt-8">
      <h3 className="heading">The Story</h3>

      <p className="text-base-content/70 mt-1 text-sm">
        {hasStoryInProgress
          ? `${formatCardsRemaining(stack.length)} · ${greyLadiesDrawn} of ${GREY_LADY_COUNT} Grey Ladies drawn`
          : "No deck yet. Set one up to begin the story."}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={stack.length === 0}
          onClick={() => {
            actions.drawCard({});
            closeMobileSidebar();
          }}
        >
          <LayersIcon className="h-5 w-5" />
          Draw a card
        </button>
        <SetUpDeckButton
          hasStoryInProgress={hasStoryInProgress}
          onSetUpDeck={() => actions.setUpDeck({})}
        />
      </div>

      {hasStoryInProgress && stack.length === 0 && (
        <p className="text-base-content/70 mt-2 text-sm italic">
          The deck is spent — the Grey Lady has had the last word.
        </p>
      )}
    </section>
  );
};
