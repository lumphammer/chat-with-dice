/**
 * Ctrl-Enter (Cmd-Enter on a Mac) submits a dialog. Every field in these
 * dialogs is a textarea, where plain Enter has to keep meaning "new line" — a
 * Period's description and a Scene's answer are both prose that wants breaks —
 * so the chord is the only way to save without reaching for the mouse.
 *
 * Shared rather than written twice, so the two dialogs can't drift into
 * disagreeing about which chord saves.
 */
export function isSubmitChord(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
}): boolean {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey);
}
