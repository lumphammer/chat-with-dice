import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { ConfirmButton } from "./ConfirmButton";
import { PlayIcon } from "lucide-react";

/**
 * Leaves setup. Asks first because it is the moment the sheet stops being a form
 * and the deck gets shuffled, so it is not something to do with a stray click.
 */
export const BeginPlayButton = () => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return null;
  }

  return (
    <ConfirmButton
      className="btn btn-primary w-full"
      title="Ready to begin the story?"
      body="Everything can be edited while playing."
      confirmLabel="Begin play"
      onConfirm={() => capInfo.actions.beginPlay({})}
    >
      <PlayIcon className="h-5 w-5" />
      Begin play
    </ConfirmButton>
  );
};
