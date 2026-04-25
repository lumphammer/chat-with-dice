import { useAutoResizeTextarea } from "../useAutoResizeTextarea";
import { useStateWithRef } from "../useStateWithRef";
import styles from "@/styles/inputs.module.css";
import { SendHorizontal } from "lucide-react";
import { type SubmitEvent, memo, useCallback } from "react";

type ChatFormProps = {
  onNewMessage: (args: { chat: string }) => void;
};

export const ChatForm = memo(({ onNewMessage }: ChatFormProps) => {
  const [chat, setChat, chatRef] = useStateWithRef("");
  const textareaRef = useAutoResizeTextarea(chat);

  const handleSubmit = useCallback(
    (event: SubmitEvent) => {
      event.preventDefault();
      if (chatRef.current.trim() === "") {
        return;
      }
      onNewMessage({
        chat: chatRef.current,
      });
      setChat("");
    },
    [chatRef, onNewMessage, setChat],
  );

  return (
    <form onSubmit={handleSubmit} className="m-4 flex flex-row">
      <textarea
        ref={textareaRef}
        rows={1}
        className={`${styles.input} frost max-h-[30cqh] flex-1 resize-none
          overflow-y-auto px-4 py-2 text-left transition-[height]`}
        value={chat}
        onChange={(e) => setChat(e.target.value)}
        placeholder="Chat"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button
        disabled={chatRef.current.trim() === ""}
        className="btn btn-primary h-auto w-12 px-6"
      >
        <span className="relative flex h-5.5 w-5.5 items-center justify-center">
          <SendHorizontal
            size={22}
            className="absolute transition-opacity duration-300"
          />
        </span>
      </button>
    </form>
  );
});

ChatForm.displayName = "DiceForm";
