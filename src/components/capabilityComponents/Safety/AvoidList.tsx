import { authClient } from "#/auth/authClient.ts";
import { safetyClient } from "#/capabilities/safety/client";
import {
  AVOIDED_SUBJECT_MAX_LENGTH,
  type AvoidedSubject,
} from "#/capabilities/safety/common";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { memo, useId, useState } from "react";

const EntryRow = memo(
  ({
    entry,
    onRemove,
  }: {
    entry: AvoidedSubject;
    onRemove?: (id: string) => void;
  }) => (
    <li className="list-row items-center px-2 py-1">
      <div className="list-col-grow wrap-break-word">
        <div>{entry.text}</div>
        <div className="text-base-content/70 text-sm">
          {entry.authorDisplayName}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          className="btn btn-ghost btn-square"
          aria-label={`Remove "${entry.text}"`}
          onClick={() => onRemove(entry.id)}
        >
          <Trash2 size={16} />
        </button>
      )}
    </li>
  ),
);

EntryRow.displayName = "EntryRow";

/**
 * The room's Avoid List: one shared list, each entry carrying its author's name
 * — the same thing a table does out loud or on a shared sheet (ADR-0003).
 *
 * One list rather than a yours/theirs split: the split only existed to give you
 * a way to find your own entries when nothing was attributed, and a name on
 * every row does that better.
 *
 * Removal is offered on your own entries, and to the room owner on anyone's.
 * The server enforces both independently — this only decides what to draw.
 */
export const AvoidList = memo(() => {
  const capInfo = safetyClient.useMount();
  const { data: sessionData } = authClient.useSession();
  const { roomOwnerId } = useRoomInfoContext();
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const viewerUserId = sessionData?.user.id ?? null;
  const isRoomOwner = viewerUserId !== null && viewerUserId === roomOwnerId;

  const entries = capInfo.initialised ? capInfo.state.entries : null;

  const trimmed = draft.trim();

  const handleAdd = () => {
    if (!capInfo.initialised || trimmed.length === 0) {
      return;
    }
    capInfo.actions.addAvoidedSubject({ id: nanoid(), text: trimmed });
    setDraft("");
  };

  const handleRemove = (id: string) => {
    if (!capInfo.initialised) {
      return;
    }
    capInfo.actions.removeAvoidedSubject({ id });
  };

  return (
    <section className="mt-8">
      <h3 className="heading">Subjects to avoid</h3>
      {/* Says whose name goes on it *before* the input, not after. Someone
          deciding whether to add "violence against children" needs to know the
          room will see it was them while they are still deciding. */}
      <p className="text-base-content/70 mt-1 text-sm">
        Anything you'd rather this game steered clear of. The whole room sees
        the list, with your name next to anything you add.
      </p>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        <label htmlFor={inputId} className="label">
          Add a subject
        </label>
        <div className="join flex w-full">
          <input
            id={inputId}
            className="input input-primary join-item flex-1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={AVOIDED_SUBJECT_MAX_LENGTH}
            placeholder="e.g. harm to animals"
          />
          <button
            type="submit"
            className="btn btn-primary join-item"
            disabled={!capInfo.initialised || trimmed.length === 0}
          >
            Add
          </button>
        </div>
      </form>

      {entries === null && <p className="mt-4">Loading…</p>}
      {entries !== null && entries.length === 0 && (
        <p className="text-base-content/70 mt-4 text-sm">
          Nobody has added anything yet.
        </p>
      )}
      {entries !== null && entries.length > 0 && (
        <ul className="list mt-4 gap-0">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onRemove={
                isRoomOwner || entry.authorUserId === viewerUserId
                  ? handleRemove
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
});

AvoidList.displayName = "AvoidList";
