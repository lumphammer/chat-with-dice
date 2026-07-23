import { ChatBubbleDialog } from "#/components/DiceRoller/ChatBubbleDialog";
import { ImagePreview } from "#/components/FileManager/ImagePreview";
import { CardDrawControls } from "./CardDrawControls";
import { memo, useId } from "react";

type CardImagePreviewProps = {
  src: string;
  alt: string;
  onError: () => void;
  // The draw's notable states ("Face down", "Inverted", or both), shown beneath
  // the enlarged image so the overlay carries the same context as the log entry.
  // Empty for a plain face-up draw, in which case no caption is rendered.
  label?: string;
  faceDown: boolean;
  hasBack: boolean;
  // Present only for the drawer. Other Room Participants continue to see the
  // read-only label in the enlarged preview.
  onSetFaceDown?: (faceDown: boolean) => void;
  onSetInverted?: (inverted: boolean) => void;
  // An Inverted draw shows the Card rotated 180° — the thumbnail is turned around
  // as if flat on the table, and the enlarged view matches so the card reads the
  // same way when opened.
  inverted?: boolean;
};

/**
 * The card image as it appears in the chat log: a thumbnail that opens an
 * enlarged, pannable and zoomable view. The overlay wears chat-bubble styling
 * (like "show more") but borrows the pan/zoom behaviour used for shared file
 * images.
 */
export const CardImagePreview = memo(
  ({
    src,
    alt,
    onError,
    label,
    faceDown,
    hasBack,
    onSetFaceDown,
    onSetInverted,
    inverted = false,
  }: CardImagePreviewProps) => {
    const dialogId = useId();

    return (
      <>
        <button
          type="button"
          // @ts-expect-error invoker api not in react types
          command="show-modal"
          commandfor={dialogId}
          className="cursor-zoom-in self-start"
        >
          <img
            src={src}
            alt={alt}
            onError={onError}
            className={`max-h-64 max-w-full rounded-md object-contain ${
              inverted ? "rotate-180" : ""
            }`}
          />
        </button>
        <ChatBubbleDialog
          id={dialogId}
          ariaLabel={alt}
          className="h-[90vh] max-h-[90vh] w-[90vw] max-w-[90vw]"
        >
          <ImagePreview src={src} alt={alt} inverted={inverted} />
          {onSetFaceDown && onSetInverted ? (
            <div className="flex justify-center">
              <CardDrawControls
                faceDown={faceDown}
                hasBack={hasBack}
                inverted={inverted}
                onSetFaceDown={onSetFaceDown}
                onSetInverted={onSetInverted}
              />
            </div>
          ) : (
            label && (
              <span className="mt-1 text-center font-medium">{label}</span>
            )
          )}
        </ChatBubbleDialog>
      </>
    );
  },
);

CardImagePreview.displayName = "CardImagePreview";
