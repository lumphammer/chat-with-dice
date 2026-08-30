import type { Protagonist } from "#/capabilities/englisheerie/common";
import { useEffect, useId, useRef, useState } from "react";

const BACKGROUND_ROWS = 3;

interface Props {
  protagonist: Protagonist;
  open: boolean;
  onClose: () => void;
  onSave: (protagonist: Protagonist) => void;
}

/**
 * The Protagonist's editor. Controlled rather than self-triggering, so the
 * section that owns the pencil button owns the open state too.
 *
 * The draft is seeded when the dialog opens and only leaves it on Save, so
 * Cancel, Escape and the backdrop all discard it alike — no blur-commit here,
 * because the dialog itself is the commit.
 */
export const ProtagonistEditDialog = ({
  protagonist,
  open,
  onClose,
  onSave,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Protagonist>(protagonist);
  // The heading a screen reader announces the dialog by.
  const titleId = useId();

  useEffect(() => {
    if (open) {
      // Opening the dialog *is* the event that seeds the draft, and the same
      // effect has to call `showModal` on the <dialog> anyway — the two belong
      // together. `protagonist` is read but deliberately not depended on; see
      // below.
      // oxlint-disable-next-line react/set-state-in-effect
      setDraft(protagonist);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
    // Deliberately not depending on `protagonist`: reseeding mid-edit because
    // somebody else saved would throw away what is being typed here.
    // oxlint-disable-next-line exhaustive-deps, react/exhaustive-effect-dependencies
  }, [open]);

  const setListItem = (
    field: "features" | "fears",
    index: number,
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].map((existing, i) =>
        i === index ? value : existing,
      ),
    }));
  };

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    onSave({
      name: draft.name.trim(),
      occupation: draft.occupation.trim(),
      background: draft.background.trim(),
      features: draft.features.map((feature) => feature.trim()),
      fears: draft.fears.map((fear) => fear.trim()),
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
          The Protagonist
        </h3>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="floating-label">
              <span>Name</span>
              <input
                className="input w-full"
                placeholder="Name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label className="floating-label">
              <span>Occupation</span>
              <input
                className="input w-full"
                placeholder="Occupation"
                value={draft.occupation}
                onChange={(event) =>
                  setDraft({ ...draft, occupation: event.target.value })
                }
              />
            </label>
          </div>

          <label className="floating-label">
            <span>Background</span>
            <textarea
              className="textarea w-full"
              rows={BACKGROUND_ROWS}
              placeholder="Background"
              value={draft.background}
              onChange={(event) =>
                setDraft({ ...draft, background: event.target.value })
              }
            />
          </label>

          <ProtagonistTrio
            legend="Features"
            values={draft.features}
            onChange={(index, value) => setListItem("features", index, value)}
          />
          <ProtagonistTrio
            legend="Fears"
            values={draft.fears}
            onChange={(index, value) => setListItem("fears", index, value)}
          />

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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

const ProtagonistTrio = ({
  legend,
  values,
  onChange,
}: {
  legend: string;
  values: string[];
  onChange: (index: number, value: string) => void;
}) => (
  <fieldset className="m-0 min-w-0 border-0 p-0">
    <legend className="muted mb-2 text-xs font-semibold tracking-wide uppercase">
      {legend}
    </legend>
    <div className="flex flex-col gap-2">
      {values.map((value, index) => (
        <input
          key={index}
          className="input w-full"
          aria-label={`${legend} ${index + 1}`}
          value={value}
          onChange={(event) => onChange(index, event.target.value)}
        />
      ))}
    </div>
  </fieldset>
);
