import { safetyClient } from "#/capabilities/safety/client";
import {
  AVOIDED_SUBJECT_MAX_LENGTH,
  type AvoidedSubject,
} from "#/capabilities/safety/common";
import { Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { memo, useId, useMemo, useState } from "react";

const EntryRow = memo(
  ({
    entry,
    onRemove,
  }: {
    entry: AvoidedSubject;
    onRemove?: (id: string) => void;
  }) => (
    <li className="list-row bg-base-200 items-center">
      <span className="flex-1 break-words">{entry.text}</span>
      {onRemove && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
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
 * The room's Avoid List: what you have added, and what the table has added.
 *
 * "From the table" is pooled and unordered by author on purpose — the server
 * sends no authorship at all, so there is nothing here to group by even if the
 * UI wanted to. Removal is only offered on your own entries, and the server
 * enforces that independently.
 */
export const AvoidList = memo(() => {
  const capInfo = safetyClient.useMount();
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const entries = capInfo.initialised ? capInfo.state.entries : null;

  const { mine, theirs } = useMemo(() => {
    return {
      mine: entries?.filter((entry) => entry.isMine) ?? [],
      theirs: entries?.filter((entry) => !entry.isMine) ?? [],
    };
  }, [entries]);

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
      <h3 className="text-xl">Subjects and ideas to avoid</h3>
      <p className="text-base-content/70 mt-1 text-sm">
        Anything you'd rather this game steered clear of. The table sees the
        list; nobody sees who added what.
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

      {entries === null ? (
        <p className="mt-4">Loading…</p>
      ) : (
        <>
          <h4 className="mt-6 text-lg">Yours</h4>
          {mine.length === 0 ? (
            <p className="text-base-content/70 text-sm">
              You haven't added anything.
            </p>
          ) : (
            <ul className="list mt-2 gap-1">
              {mine.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          )}

          <h4 className="mt-6 text-lg">From the table</h4>
          {theirs.length === 0 ? (
            <p className="text-base-content/70 text-sm">
              Nobody else has added anything.
            </p>
          ) : (
            <ul className="list mt-2 gap-1">
              {theirs.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
});

AvoidList.displayName = "AvoidList";
