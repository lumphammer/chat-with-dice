import { authClient } from "#/utils/auth-client";
import { generateRandomName } from "#/utils/generateRandomName";
import { Dice6, LogIn, User } from "lucide-react";
import {
  type SubmitEvent,
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type AnonymousEntryDialogProps = {
  onUpdateNameError: (message: string) => void;
};

export const AnonymousEntryDialog = memo(
  ({ onUpdateNameError }: AnonymousEntryDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [displayName, setDisplayName] = useState(() => generateRandomName());
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useLayoutEffect(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    }, []);

    const handleSubmit = useCallback(
      async (event: SubmitEvent) => {
        event.preventDefault();
        if (submitting) return;
        const trimmed = displayName.trim();
        if (trimmed === "") return;

        setSubmitting(true);
        setError(null);

        const { error: signInError } = await authClient.signIn.anonymous();
        if (signInError) {
          setSubmitting(false);
          setError(
            signInError.message ??
              "Could not enter the room. Please try again.",
          );
          return;
        }

        const { error: updateError } = await authClient.updateUser({
          name: trimmed,
        });
        if (updateError) {
          // The anonymous sign-in succeeded, so the session is now non-null
          // and the parent will unmount us. Surface the rename failure via
          // toast so the user knows their chosen name didn't save and where
          // to fix it. Do not roll back the sign-in.
          onUpdateNameError(updateError.message ?? "Update failed.");
        }
        // No explicit close — parent unmounts us when sessionData flips
        // non-null.
      },
      [displayName, onUpdateNameError, submitting],
    );

    return (
      <dialog ref={dialogRef} closedby="none" className="dialog prose">
        <h2>Enter anonymously</h2>
        <p className="text-sm">
          You're joining this room as an anonymous user. Pick a display name
          below — you can sign up later to keep your name across rooms.
        </p>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="noprose flex flex-col gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Display name</legend>
            <div className="join w-full">
              <label className="input join-item flex-1">
                <User size={16} className="opacity-50" />
                <input
                  type="text"
                  placeholder="Adventurous Badger"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-outline join-item" //
                title="Generate random name"
                aria-label="Generate random name"
                onClick={() => setDisplayName(generateRandomName())}
                disabled={submitting}
              >
                <Dice6 size={18} />
              </button>
            </div>
          </fieldset>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting || displayName.trim() === ""}
          >
            {submitting && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Enter room
          </button>
        </form>

        <p className="text-sm">
          Already have an account?{" "}
          <a
            href={`/signin?returnUrl=${encodeURIComponent(window.location.pathname)}`}
            className="link link-primary inline-flex items-center gap-1"
          >
            <LogIn size={14} />
            Sign in
          </a>
        </p>
      </dialog>
    );
  },
);

AnonymousEntryDialog.displayName = "AnonymousEntryDialog";
