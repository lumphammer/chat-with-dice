import { microscopeClient } from "#/capabilities/microscope/client";
import { MAX_TEXT_LENGTH } from "#/capabilities/microscope/common";
import { Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { memo, useId, useState } from "react";

/**
 * One half of the Palette. Modelled on the Avoid List, with one difference that
 * matters: Palette entries carry no author. A Yes or a No is a statement about
 * the *history*, agreed by the table, not a request from a person — attributing
 * them would turn a shared boundary into somebody's preference.
 */
export const PaletteList = memo(
  ({
    list,
    heading,
    description,
    placeholder,
  }: {
    list: "yes" | "no";
    heading: string;
    description: string;
    placeholder: string;
  }) => {
    const capInfo = microscopeClient.useMount();
    const [draft, setDraft] = useState("");
    const inputId = useId();

    const entries = capInfo.initialised ? capInfo.state.palette[list] : null;
    const trimmed = draft.trim();

    const handleAdd = () => {
      if (!capInfo.initialised || trimmed.length === 0) {
        return;
      }
      capInfo.actions.addPaletteEntry({ id: nanoid(), list, text: trimmed });
      setDraft("");
    };

    const handleRemove = (id: string) => {
      if (!capInfo.initialised) {
        return;
      }
      capInfo.actions.removePaletteEntry({ id, list });
    };

    return (
      <section>
        <h3 className="heading">{heading}</h3>
        <p className="muted mt-1 text-sm">{description}</p>

        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleAdd();
          }}
        >
          <label htmlFor={inputId} className="label">
            Add to the {heading} list
          </label>
          <div className="join flex w-full">
            <input
              id={inputId}
              className="input input-primary join-item flex-1"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_TEXT_LENGTH}
              placeholder={placeholder}
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

        {entries !== null && entries.length === 0 && (
          <p className="muted mt-4 text-sm">Nothing on this list yet.</p>
        )}
        {entries !== null && entries.length > 0 && (
          <ul className="list mt-4 gap-0">
            {entries.map((entry) => (
              <li key={entry.id} className="list-row items-center px-2 py-1">
                <div className="list-col-grow wrap-break-word">
                  {entry.text}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-square"
                  aria-label={`Remove "${entry.text}"`}
                  onClick={() => handleRemove(entry.id)}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  },
);

PaletteList.displayName = "PaletteList";
