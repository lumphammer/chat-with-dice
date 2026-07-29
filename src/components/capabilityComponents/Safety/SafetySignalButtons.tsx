import { safetyClient } from "#/capabilities/safety/client";
import { SIGNAL_PRESENTATION } from "./signalPresentation";
import { memo, useState } from "react";

/**
 * The two Safety Signal triggers, plus the choice of whether to attach your
 * name.
 *
 * The buttons are large and unequal on purpose: the X Card is the one you must
 * be able to hit without hunting for it, and Pause should read as the lesser
 * action rather than as its twin.
 */
export const SafetySignalButtons = memo(() => {
  const capInfo = safetyClient.useMount();
  const [anonymously, setAnonymously] = useState(false);

  const raise = (kind: "xcard" | "pause") => {
    if (!capInfo.initialised) {
      return;
    }
    capInfo.actions.raiseSignal({ kind, unattributed: anonymously });
  };

  return (
    <section>
      {/* The control is nested rather than wired up with `htmlFor`, matching
          the room config toggles — an implicit association needs no id, and the
          whole row stays tappable. The label text is laid out with a grid
          rather than wrapped in a container span so it stays a direct child:
          jsx-a11y only looks so deep for a label's accessible text. */}
      <label
        className="border-base-300 bg-base-100 rounded-box mb-4 grid
          cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 border px-4
          py-3"
      >
        <span className="font-medium">Send anonymously</span>
        <input
          className="checkbox col-start-2 row-span-2 row-start-1"
          type="checkbox"
          checked={anonymously}
          onChange={(event) => setAnonymously(event.target.checked)}
        />
        <span className="text-base-content/70 col-start-1 row-start-2 text-sm">
          Your name is never recorded — not for the room owner either.
        </span>
      </label>

      <button
        type="button"
        className={`btn btn-block btn-lg h-20 text-2xl
          ${SIGNAL_PRESENTATION.xcard.buttonClass}`}
        disabled={!capInfo.initialised}
        onClick={() => raise("xcard")}
      >
        <SIGNAL_PRESENTATION.xcard.Icon className="h-8 w-8" />X Card
      </button>
      <p className="text-base-content/70 mt-2 mb-4 text-sm">
        Stops the scene for everyone. You never have to explain why.
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
      <p className="text-base-content/70 mt-2 text-sm">
        Asks the table to hold on a moment.
      </p>
    </section>
  );
});

SafetySignalButtons.displayName = "SafetySignalButtons";
