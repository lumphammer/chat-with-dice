import { safetyClient } from "#/capabilities/safety/client";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { SIGNAL_PRESENTATION } from "./signalPresentation";
import { memo, useState } from "react";

/**
 * The two Safety Signal triggers, plus the choice of whether to attach your
 * name.
 *
 * Order and weight are the whole design here. The X Card comes first and is
 * much the largest thing in the panel — it is the control you must be able to
 * hit without hunting for it. Pause reads as the lesser action rather than as
 * its twin, and the anonymity choice sits below both: it is a setting, not a
 * step on the way to raising a signal.
 */
export const SafetySignalButtons = memo(() => {
  const closeMobileSidebar = useCloseMobileSidebar();

  const capInfo = safetyClient.useMount();
  // Ticked by default, and re-ticked whenever this panel remounts. Erring
  // towards anonymity is the safe direction to fail in: someone who wanted
  // their name on it can add it deliberately, whereas a stale unticked box
  // would attach a name nobody asked to give.
  const [anonymously, setAnonymously] = useState(true);

  const raise = (kind: "xcard" | "pause") => {
    if (!capInfo.initialised) {
      return;
    }
    capInfo.actions.raiseSignal({ kind, unattributed: anonymously });
    closeMobileSidebar();
  };

  return (
    <section>
      <h3 className="heading my-2">Signals</h3>
      {/* `flex-col` overrides the row layout `.btn` gives its children, so the
          X reads as a card being played rather than as a stray glyph in front
          of the words. `h-auto` because the stacked content sets the height. */}
      <button
        type="button"
        className={`btn btn-block btn-lg h-auto flex-col gap-1 py-4 text-2xl
          ${SIGNAL_PRESENTATION.xcard.buttonClass}`}
        disabled={!capInfo.initialised}
        onClick={() => raise("xcard")}
      >
        <SIGNAL_PRESENTATION.xcard.Icon className="h-12 w-12" />X Card
      </button>
      <p className="text-base-content/70 mt-2 mb-4 text-sm">
        Stop and change, rewind, or skip the current content. No explanation is
        required.
      </p>

      <button
        type="button"
        className={`btn btn-block ${SIGNAL_PRESENTATION.pause.buttonClass}`}
        disabled={!capInfo.initialised}
        onClick={() => raise("pause")}
      >
        <SIGNAL_PRESENTATION.pause.Icon className="h-5 w-5" />
        Pause
      </button>
      <p className="text-base-content/70 mt-2 mb-4 text-sm">
        Ask the table to pause for a break or check-in before continuing.
      </p>

      {/* The control is nested rather than wired up with `htmlFor`, matching
          the room config toggles — an implicit association needs no id, and the
          whole row stays tappable. The label text is laid out with a grid
          rather than wrapped in a container span so it stays a direct child:
          jsx-a11y only looks so deep for a label's accessible text. */}
      <label
        className="surface grid cursor-pointer grid-cols-[1fr_auto] items-center
          gap-x-3 px-4 py-3"
      >
        <span className="font-medium">Send safety signals anonymously</span>
        <input
          className="checkbox col-start-2 row-span-2 row-start-1"
          type="checkbox"
          checked={anonymously}
          onChange={(event) => setAnonymously(event.target.checked)}
        />
        <span className="text-base-content/70 col-start-1 row-start-2 text-sm">
          Anonymous signals are stored without your name.
        </span>
      </label>
    </section>
  );
});

SafetySignalButtons.displayName = "SafetySignalButtons";
