import { useEffect, useState } from "react";

interface Props {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  /** Renders a textarea, in which Enter starts a new line rather than committing. */
  multiline?: boolean;
  rows?: number;
}

/**
 * A sheet field over shared, broadcast state. The Protagonist belongs to the
 * whole room, so sending every keystroke would spray the table with patches —
 * the value is held locally and committed on blur (and on Enter, for a
 * single-line field).
 *
 * While the field isn't focused it follows the shared value, so somebody else's
 * edit lands here as you'd expect; while it is focused it doesn't, so their edit
 * can't yank the text out from under your cursor.
 */
export const CommittedTextField = ({
  label,
  value,
  onCommit,
  multiline = false,
  rows,
}: Props) => {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
    }
  }, [value, isFocused]);

  const commit = () => {
    setIsFocused(false);
    if (draft !== value) {
      onCommit(draft);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape") {
      setDraft(value);
      event.currentTarget.blur();
    } else if (event.key === "Enter" && !multiline) {
      event.currentTarget.blur();
    }
  };

  return (
    <label className="floating-label">
      <span>{label}</span>
      {multiline ? (
        <textarea
          className="textarea w-full"
          rows={rows}
          value={draft}
          placeholder={label}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <input
          className="input w-full"
          value={draft}
          placeholder={label}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      )}
    </label>
  );
};
