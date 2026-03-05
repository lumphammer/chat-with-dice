import { Dices, SendHorizontal } from "lucide-react";
import { type SubmitEvent, memo, useCallback, useState } from "react";

type ChatFormProps = {
  onNewMessage: (args: { formula: string; text: string }) => void;
};

export const ChatForm = memo(({ onNewMessage }: ChatFormProps) => {
  const [formula, setFormula] = useState("");
  const [text, setText] = useState("");

  const handleSubmit = useCallback(
    (event: SubmitEvent) => {
      event.preventDefault();
      onNewMessage({ formula, text });
    },
    [formula, text, onNewMessage],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-row flex-wrap p-4">
      <div
        className="border-primary flex min-w-0 flex-1 flex-row flex-wrap
          overflow-hidden rounded-l-xl border shadow-sm"
      >
        <input
          className="bg-base-100 border-base-300
            placeholder:text-base-content/40 min-w-100 flex-1 border-b px-4 py-2
            outline-none sm:border-r sm:border-b-0"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder='Dice formula, e.g. "3d6"'
        />
        <textarea
          rows={1}
          className="bg-base-100 placeholder:text-base-content/40
            field-sizing-content max-h-[30cqh] min-w-0 flex-1 resize-none
            overflow-y-auto px-4 py-2 outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={formula.trim() ? "Annotation" : "Chat message"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </div>
      <button
        className="btn btn-primary h-auto self-stretch rounded-none rounded-r-xl
          px-6"
      >
        <span className="relative flex h-5.5 w-5.5 items-center justify-center">
          <SendHorizontal
            size={22}
            className={`absolute transition-opacity duration-300
              ${formula.trim() ? "opacity-0" : "opacity-100"}`}
          />
          <Dices
            size={22}
            className={`absolute transition-opacity duration-300
              ${formula.trim() ? "opacity-100" : "opacity-0"}`}
          />
        </span>
      </button>
    </form>
  );
});

ChatForm.displayName = "DiceForm";
