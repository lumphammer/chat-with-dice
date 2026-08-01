import { useEffect, useState } from "react";

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
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  /** Renders a textarea, in which Enter starts a new line rather than committing. */
  multiline?: boolean;
  rows?: number;
}) => {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // incoming changes - if not focused, set the draft
  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
    }
  }, [value, isFocused]);

  // edit handler
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDraft(event.target.value);
  };

  // evant handler for blur
  const handleBlur = () => {
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
      const target = event.currentTarget;
      setTimeout(() => {
        target.blur();
      }, 0);
    } else if (event.key === "Enter" && !multiline) {
      event.currentTarget.blur();
    }
  };

  return (
    <label className="floating-label">
      <span>{label}</span>
      {multiline ? (
        <textarea
          className="textarea textarea-neutral w-full"
          rows={rows}
          value={draft}
          placeholder={label}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <input
          className="input input-neutral w-full"
          value={draft}
          placeholder={label}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      )}
    </label>
  );
};
