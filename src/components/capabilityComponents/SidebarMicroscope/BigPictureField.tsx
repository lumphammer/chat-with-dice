import { microscopeClient } from "#/capabilities/microscope/client";
import { CommittedTextField } from "../shared/CommittedTextField";
import { memo } from "react";

const BIG_PICTURE_ROWS = 2;

/**
 * The Big Picture sits above the history rather than in a tab of its own: it is
 * one sentence, and it is the thing every card on the timeline has to be
 * consistent with, so it belongs where the cards are.
 */
export const BigPictureField = memo(() => {
  const capInfo = microscopeClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  return (
    <section>
      <h3 className="heading">The Big Picture</h3>
      <p className="muted mt-1 mb-3 text-sm">
        One sentence covering the whole sweep of this history. Nothing else in
        the game may contradict it.
      </p>
      <CommittedTextField
        label="The Big Picture"
        value={capInfo.state.bigPicture}
        multiline
        rows={BIG_PICTURE_ROWS}
        onCommit={(text) => capInfo.actions.setBigPicture({ text })}
      />
    </section>
  );
});

BigPictureField.displayName = "BigPictureField";
