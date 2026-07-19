import { ChatBubbleDialog } from "#/components/DiceRoller/ChatBubbleDialog";
import { ImagePreview } from "#/components/FileManager/ImagePreview";
import { memo, useId } from "react";

type CardImagePreviewProps = {
  src: string;
  alt: string;
  onError: () => void;
  // An Inverted draw shows the Card rotated 180° in the chat log — the thumbnail
  // is turned around as if flat on the table. The enlarged pan/zoom view is left
  // upright: its transform is driven off pointer coordinates and a rotation there
  // would fight that maths, so the rotation belongs to the static thumbnail.
  inverted?: boolean;
};

/**
 * The card image as it appears in the chat log: a thumbnail that opens an
 * enlarged, pannable and zoomable view. The overlay wears chat-bubble styling
 * (like "show more") but borrows the pan/zoom behaviour used for shared file
 * images.
 */
export const CardImagePreview = memo(
  ({ src, alt, onError, inverted = false }: CardImagePreviewProps) => {
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
          <ImagePreview src={src} alt={alt} />
        </ChatBubbleDialog>
      </>
    );
  },
);

CardImagePreview.displayName = "CardImagePreview";
