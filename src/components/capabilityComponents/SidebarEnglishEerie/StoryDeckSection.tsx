import { englisheerieClient } from "#/capabilities/englisheerie/client";
import {
  GREY_LADY_COUNT,
  hasUnrolledObstruction,
} from "#/capabilities/englisheerie/common";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { SetUpDeckButton } from "./SetUpDeckButton";
import { formatCardsRemaining } from "./formatCardsRemaining";
import { LayersIcon } from "lucide-react";
import { useId } from "react";

/**
 * The Story Deck. Play mode only, and by then there is always a deck: beginning
 * play shuffles one when the room has never had one, so there is nothing to
 * write for a room that has never drawn. Nineteen draws later the deck does run
 * out, and that end-of-story state is written for below.
 */
export const StoryDeckSection = () => {
  const capInfo = englisheerieClient.useMount();
  const closeMobileSidebar = useCloseMobileSidebar();
  // Whatever stops the draw is said out loud rather than left to a dimmed
  // button, and pointed at from the button so it is announced too.
  const hintId = useId();

  if (!capInfo.initialised) {
    return null;
  }

  const { stack, drawn } = capInfo.state;
  const { actions } = capInfo;
  const mustRollObstruction = hasUnrolledObstruction(capInfo.state);
  const greyLadiesDrawn = drawn.filter(
    (card) => card.kind === "greyLady",
  ).length;
  const drawHint = mustRollObstruction
    ? "Roll against the current obstruction before drawing another card."
    : stack.length === 0
      ? "The deck is spent — the Grey Lady has had the last word."
      : undefined;

  return (
    <section>
      <p className="text-base-content/90 mt-1 text-sm">
        {formatCardsRemaining(stack.length)} · {greyLadiesDrawn} of{" "}
        {GREY_LADY_COUNT} Grey Ladies drawn
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={stack.length === 0 || mustRollObstruction}
          aria-describedby={drawHint === undefined ? undefined : hintId}
          onClick={() => {
            actions.drawCard({});
            closeMobileSidebar();
          }}
        >
          <LayersIcon className="h-5 w-5" />
          Draw a card
        </button>
        <SetUpDeckButton
          onSetUpDeck={() => actions.setUpDeck({})}
          onResetGame={() => actions.resetGame({})}
        />
      </div>

      {drawHint !== undefined && (
        <p id={hintId} className="text-base-content/70 mt-2 text-sm italic">
          {drawHint}
        </p>
      )}
    </section>
  );
};
