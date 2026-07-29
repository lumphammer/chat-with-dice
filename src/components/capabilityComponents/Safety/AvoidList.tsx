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

type AvoidedSubjectGroup = {
  authorUserId: string;
  authorDisplayName: string;
  entries: AvoidedSubject[];
};

const groupEntriesByAuthor = (
  entries: AvoidedSubject[],
  viewerUserId: string | null,
) => {
  const groupsByAuthor = new Map<string, AvoidedSubjectGroup>();

  for (const entry of entries) {
    const group = groupsByAuthor.get(entry.authorUserId);

    if (group) {
      group.entries.push(entry);
    } else {
      groupsByAuthor.set(entry.authorUserId, {
        authorUserId: entry.authorUserId,
        authorDisplayName: entry.authorDisplayName,
        entries: [entry],
      });
    }
  }

  const groups = [...groupsByAuthor.values()];
  const viewerGroup = viewerUserId
    ? groupsByAuthor.get(viewerUserId)
    : undefined;

  if (!viewerGroup) {
    return groups;
  }

  return [
    viewerGroup,
    ...groups.filter((group) => group.authorUserId !== viewerUserId),
  ];
};

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
 * The room's Avoid List: one shared list, grouped by author. The viewer's
 * entries come first, followed by other authors in order of first appearance.
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
  const entryGroups =
    entries === null ? [] : groupEntriesByAuthor(entries, viewerUserId);

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
        the list, grouped by who added each subject.
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
        <div className="mt-4 space-y-4">
          {entryGroups.map((group) => (
            <section key={group.authorUserId}>
              <h4 className="text-sm font-semibold">
                {group.authorUserId === viewerUserId
                  ? "Yours"
                  : group.authorDisplayName}
              </h4>
              <ul className="list mt-1 gap-0">
                {group.entries.map((entry) => (
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
            </section>
          ))}
        </div>
      )}
    </section>
  );
});

AvoidList.displayName = "AvoidList";
