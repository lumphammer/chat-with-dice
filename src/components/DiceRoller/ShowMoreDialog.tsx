import { ChatBubbleDialog } from "./ChatBubbleDialog";
import { memo, useId } from "react";

type ShowMoreDialogProps = {
  html: string;
};

export const ShowMoreDialog = memo(({ html }: ShowMoreDialogProps) => {
  const dialogId = useId();

  return (
    <>
      <div className="text-center">
        <button
          // @ts-expect-error invoker api not in react types
          command="show-modal"
          commandfor={dialogId}
          className="btn btn-secondary btn-link relative -top-1 h-auto px-2
            py-0"
        >
          Show more
        </button>
      </div>
      <ChatBubbleDialog id={dialogId} ariaLabel="Expanded message">
        <article
          className="prose flex-1 overflow-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        ></article>
      </ChatBubbleDialog>
    </>
  );
});

ShowMoreDialog.displayName = "ShowMoreDialog";
