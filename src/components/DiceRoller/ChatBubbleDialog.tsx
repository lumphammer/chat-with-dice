import { X } from "lucide-react";
import { memo, type ReactNode } from "react";

type ChatBubbleDialogProps = {
  /**
   * The dialog's id. Wire a trigger to it with the invoker command api, e.g.
   * `<button command="show-modal" commandfor={id}>`.
   */
  id: string;
  /** Accessible name for the dialog, announced by screen readers. */
  ariaLabel: string;
  /** Extra classes appended to the dialog (e.g. to give it a size). */
  className?: string;
  children: ReactNode;
};

/**
 * A modal dialog that wears chat-bubble styling rather than the standard modal
 * chrome, so an overlay reads as an extension of the message it sprang from.
 * The caller owns the trigger and passes its shared id in.
 */
export const ChatBubbleDialog = memo(
  ({ id, ariaLabel, className, children }: ChatBubbleDialogProps) => {
    return (
      <dialog
        id={id}
        closedby="any"
        aria-label={ariaLabel}
        className={`chat-bubble animate-fadeout open:animate-fadein
          backdrop:animate-fadeout open:backdrop:animate-fadein absolute m-auto
          flex-col text-left
          [transition:display_300ms_allow-discrete,overlay_300ms_allow-discrete]
          backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex ${
            className ?? ""
          }`}
      >
        <nav className="flex flex-row justify-end">
          <button
            type="button"
            aria-label="Close"
            className="btn btn-ghost"
            // @ts-expect-error invoker api not in react types yet
            commandfor={id}
            command="close"
          >
            <X />
          </button>
        </nav>
        {children}
      </dialog>
    );
  },
);

ChatBubbleDialog.displayName = "ChatBubbleDialog";
