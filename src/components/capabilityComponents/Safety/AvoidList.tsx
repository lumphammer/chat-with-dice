import { authClient } from "#/auth/authClient.ts";
import { safetyClient } from "#/capabilities/safety/client";
import {
  AVOIDED_SUBJECT_MAX_LENGTH,
  type AvoidedSubject,
} from "#/capabilities/safety/common";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
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
    <>
      <li className="list-row items-center px-2 py-0">
        <div className="list-col-grow wrap-break-word">{entry.text}</div>
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
    </>
  ),
);

EntryRow.displayName = "EntryRow";

/**
 * The room's Avoid List: what you have added, and what the table has added.
 *
 * "From the table" is pooled and unordered by author on purpose — the server
 * sends no authorship at all, so there is nothing here to group by even if the
 * UI wanted to. Removal is offered on your own entries, and to the room owner
 * on anyone's; the server enforces both independently.
 *
 * An owner removing someone's entry still learns nothing about who wrote it —
 * the moderation power and the anonymity are separate concerns.
 */
export const AvoidList = memo(() => {
  const capInfo = safetyClient.useMount();
  const { data: sessionData } = authClient.useSession();
  const { roomOwnerId } = useRoomInfoContext();
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const isRoomOwner =
    sessionData !== null && sessionData.user.id === roomOwnerId;

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
      <h3 className="heading">Subjects to avoid</h3>
      <p className="text-base-content/70 mt-1 text-sm">
        Anything you'd rather this game steered clear of. The room sees the
        list, but nobody sees who added what.
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
            <ul className="list mt-2 gap-0">
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
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onRemove={isRoomOwner ? handleRemove : undefined}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
});

AvoidList.displayName = "AvoidList";
