import { ChatBubbleDialog } from "#/components/DiceRoller/ChatBubbleDialog";
import { ImagePreview } from "#/components/FileManager/ImagePreview";
import { memo, useId } from "react";

type CardImagePreviewProps = {
  src: string;
  alt: string;
  onError: () => void;
};

/**
 * The card image as it appears in the chat log: a thumbnail that opens an
 * enlarged, pannable and zoomable view. The overlay wears chat-bubble styling
 * (like "show more") but borrows the pan/zoom behaviour used for shared file
 * images.
 */
export const CardImagePreview = memo(
  ({ src, alt, onError }: CardImagePreviewProps) => {
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
            className="max-h-64 max-w-full rounded-md object-contain"
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
