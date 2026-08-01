import { type ReactNode, useId, useRef } from "react";

/**
 * A button that asks before it acts. The sidebar has three of these — beginning
 * play, resetting the game, and reshuffling the deck — and they only differ in
 * their wording.
 *
 * `closedby="any"` gives Escape and the backdrop for free, so there is no
 * backdrop button to duplicate Cancel.
 */
export const ConfirmButton = ({
  children,
  className,
  title,
  body,
  primaryLabel,
  onPrimary,
  primaryClass = "primary",
  secondaryLabel,
  onSecondary,
  secondaryClass = "secondary",
}: {
  /** What the trigger says. */
  children: ReactNode;
  /** Classes for the trigger. The dialog's own buttons are styled here. */
  className: string;
  title: string;
  body: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryClass?: "warning" | "danger" | "primary";
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryClass?: "warning" | "danger" | "secondary";
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The sidebar mounts several of these at once, so the heading a screen reader
  // announces the dialog by can't have a hard-coded id.
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => dialogRef.current?.showModal()}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        closedby="any"
        className="modal"
        aria-labelledby={titleId}
      >
        <div className="modal-box">
          <h3 id={titleId} className="text-lg font-bold">
            {title}
          </h3>
          <div className="text-base-content/70 py-2 text-sm">{body}</div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            {secondaryLabel && onSecondary && (
              <button
                type="button"
                className="btn data-[class=danger]:btn-error
                  data-[class=warning]:btn-warning
                  data-[class=secondary]:btn-secondary"
                data-class={secondaryClass}
                onClick={() => {
                  onSecondary();
                  dialogRef.current?.close();
                }}
              >
                {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              className="btn data-[class=danger]:btn-error
                data-[class=warning]:btn-warning
                data-[class=primary]:btn-primary"
              data-class={primaryClass}

              onClick={() => {
                onPrimary();
                dialogRef.current?.close();
              }}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
};
