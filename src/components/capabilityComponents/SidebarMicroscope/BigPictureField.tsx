import { microscopeClient } from "#/capabilities/microscope/client";
import { TextEditDialog } from "./TextEditDialog";
import { PencilIcon } from "lucide-react";
import { memo, useState } from "react";

/**
 * The Big Picture sits above the history rather than in a tab of its own: it is
 * one sentence, and it is the thing every card on the timeline has to be
 * consistent with, so it belongs where the cards are.
 *
 * Read-only until someone asks to change it. A permanently open textarea reads
 * as a form to fill in, which is wrong for a line that gets written once in
 * setup and then quietly governs everything else — and it costs the height of
 * an editor at the top of the panel forever.
 */
export const BigPictureField = memo(() => {
  const capInfo = microscopeClient.useMount();
  const [isEditing, setIsEditing] = useState(false);

  if (!capInfo.initialised) {
    return null;
  }

  const { bigPicture } = capInfo.state;

  return (
    <section>
      <div className="flex items-center gap-1.5">
        <h3 className="heading grow">The Big Picture</h3>
        <button
          type="button"
          className="muted hover:text-base-content shrink-0 cursor-pointer
            rounded p-1 transition-colors"
          aria-label="Edit the Big Picture"
          onClick={() => setIsEditing(true)}
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </div>

      {bigPicture.length > 0 ? (
        <p className="wrap-break-word">{bigPicture}</p>
      ) : (
        <p className="muted text-sm">Not set yet.</p>
      )}

      <TextEditDialog
        open={isEditing}
        title="The Big Picture"
        label="The Big Picture"
        initialValue={bigPicture}
        onClose={() => setIsEditing(false)}
        onSave={(text) => capInfo.actions.setBigPicture({ text })}
      />
    </section>
  );
});

BigPictureField.displayName = "BigPictureField";
