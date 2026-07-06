import { X } from "lucide-react";
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
          // onClick={() => setShowMore(true)}
          className="btn btn-secondary btn-link relative -top-1 h-auto px-2 py-0
            text-sm"
        >
          Show more
        </button>
      </div>
      <dialog
        id={dialogId}
        closedby="any"
        className="chat-bubble animate-fadeout open:animate-fadein
          backdrop:animate-fadeout open:backdrop:animate-fadein absolute m-auto
          flex-col text-left
          [transition:display_300ms_allow-discrete,overlay_300ms_allow-discrete]
          backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex"
      >
        <nav className="flex flex-row justify-end">
          <button
            className="btn btn-ghost"
            // @ts-expect-error invoker api not in react types yet
            commandfor={dialogId}
            command="close"
          >
            <X />
          </button>
        </nav>
        <article
          className="prose flex-1 overflow-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        ></article>
      </dialog>
    </>
  );
});

ShowMoreDialog.displayName = "ShowMoreDialog";
