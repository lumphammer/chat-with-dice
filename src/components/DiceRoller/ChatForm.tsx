import { useAutoResizeTextarea } from "../useAutoResizeTextarea";
import { useStateWithRef } from "../useStateWithRef";
import styles from "@/styles/inputs.module.css";
import { SendHorizontal } from "lucide-react";
import { type SubmitEvent, memo, useCallback } from "react";

// * Normal (X Y Z) => Total, success?
//   * Normal
//   * With advantage
//   * With disadvantage
//   * Exploding
// * F20 (CST=20, T) => Total, success?, is crit?
//   * Normal
//   * With advantage
//   * With disadvantage
// * Havoc (X) => hits, crits
// * FitD (X) => Result(Fail, Success with complications, crits?)
// * Gumshoe (X) => total
// * Formula (formula) => total

type ChatFormProps = {
  onNewMessage: (args: { chat: string }) => void;
};

export const ChatForm = memo(({ onNewMessage }: ChatFormProps) => {
  const [chat, setChat, chatRef] = useStateWithRef("");
  const textareaRef = useAutoResizeTextarea(chat);

  const handleSubmit = useCallback(
    (event: SubmitEvent) => {
      event.preventDefault();
      onNewMessage({
        chat: chatRef.current,
      });
    },
    [chatRef, onNewMessage],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="border-primary m-4 flex flex-row overflow-hidden rounded-xl
        border"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        className={`${styles.input} max-h-[30cqh] flex-1 resize-none
          overflow-y-auto rounded-l-xl px-4 py-2 text-left`}
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
      <button className="btn btn-primary h-auto w-12 px-6">
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
