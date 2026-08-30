import {
  MAX_TEXT_LENGTH,
  type ItemKind,
  type Tone,
} from "#/capabilities/microscope/common";
import { TONE_LABELS } from "./presentation";
import { useEffect, useId, useRef, useState } from "react";

const TEXT_ROWS = 3;

export type ItemDraft = { tone: Tone; text: string; answer: string };

interface Props {
  open: boolean;
  title: string;
  kind: ItemKind;
  /** Seeded into the fields each time the dialog opens. */
  initialValues: ItemDraft;
  /** Scenes only, and only once the scene exists — a new one has no answer yet. */
  showAnswer: boolean;
  onClose: () => void;
  onSave: (draft: ItemDraft) => void;
}

/**
 * The one editor for all three levels of the fractal, in both making and
 * editing. The levels differ only in wording and in whether a Scene's Answer is
 * on show, which is not enough to justify three dialogs.
 *
 * Controlled, like `ProtagonistEditDialog`: the card that owns the menu owns
 * the open state. The draft is seeded on open and only leaves on Save, so
 * Cancel, Escape and the backdrop all discard alike.
 */
export const ItemEditDialog = ({
  open,
  title,
  kind,
  initialValues,
  showAnswer,
  onClose,
  onSave,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<ItemDraft>(initialValues);
  const titleId = useId();
  const toneGroupName = useId();

  useEffect(() => {
    if (open) {
      // Opening is what seeds the draft, and the same effect has to call
      // `showModal` anyway. `initialValues` is read but not depended on:
      // reseeding because somebody else edited this card mid-sentence would
      // throw away what is being typed.
      // oxlint-disable-next-line react/set-state-in-effect
      setDraft(initialValues);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
    // oxlint-disable-next-line exhaustive-deps, react/exhaustive-effect-dependencies
  }, [open]);

  const isScene = kind === "scene";
  const textLabel = isScene ? "Question" : "Description";
  const canSave = draft.text.trim().length > 0;

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    onSave({
      tone: draft.tone,
      text: draft.text.trim(),
      answer: draft.answer.trim(),
    });
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className="modal-box">
        <h3 id={titleId} className="text-lg font-bold">
          {title}
        </h3>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* A reset fieldset rather than a labelled div: two radios need a
              group label, and `<div role="group">` is off the table here. */}
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend
              className="muted mb-2 text-xs font-semibold tracking-wide
                uppercase"
            >
              Tone
            </legend>
            <div className="join">
              {(["light", "dark"] as const).map((tone) => (
                <input
                  key={tone}
                  type="radio"
                  name={toneGroupName}
                  className="btn join-item"
                  aria-label={TONE_LABELS[tone]}
                  checked={draft.tone === tone}
                  onChange={() => setDraft({ ...draft, tone })}
                />
              ))}
            </div>
          </fieldset>

          <label className="floating-label">
            <span>{textLabel}</span>
            <textarea
              className="textarea textarea-neutral w-full"
              rows={TEXT_ROWS}
              maxLength={MAX_TEXT_LENGTH}
              placeholder={
                isScene ? "What does this scene ask?" : "What happens?"
              }
              value={draft.text}
              onChange={(event) =>
                setDraft({ ...draft, text: event.target.value })
              }
            />
          </label>

          {showAnswer && (
            <label className="floating-label">
              <span>Answer</span>
              <textarea
                className="textarea textarea-neutral w-full"
                rows={TEXT_ROWS}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="Left blank until the scene has been played"
                value={draft.answer}
                onChange={(event) =>
                  setDraft({ ...draft, answer: event.target.value })
                }
              />
            </label>
          )}

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSave}
            >
              Save
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};
