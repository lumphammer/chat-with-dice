import { RollTypePicker, type RollType } from "./RollTypePicker";
import { StandardDieRollForm } from "./StandardDieRollForm/StandardDieRollForm";
import { FormulaContextProvider } from "./formulaContext";
import { Dices, SendHorizontal } from "lucide-react";
import { type SubmitEvent, memo, useCallback, useMemo, useState } from "react";

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
  onNewMessage: (args: { formula: string; text: string }) => void;
};

export const ChatForm = memo(({ onNewMessage }: ChatFormProps) => {
  const [formula, setFormula] = useState("");
  const [text, setText] = useState("");
  const [rollType, setRollType] = useState<"standard" | "f20">("standard");

  const formulaContextValue = useMemo(() => {
    return {
      setFormula,
      formula,
    };
  }, [formula, setFormula]);

  const handleSubmit = useCallback(
    (event: SubmitEvent) => {
      event.preventDefault();
      onNewMessage({ formula, text });
    },
    [formula, text, onNewMessage],
  );

  return (
    <FormulaContextProvider value={formulaContextValue}>
      <form onSubmit={handleSubmit} className="flex flex-row flex-wrap p-4">
        <div
          className="border-primary flex min-w-0 flex-1 flex-row flex-wrap
            overflow-hidden rounded-l-xl border shadow-sm"
        >
          <RollTypePicker rollType={rollType} setRollType={setRollType} />
          {rollType === "standard" && <StandardDieRollForm />}
          <textarea
            rows={1}
            className="bg-base-100 placeholder:text-base-content/40
              border-neutral/30 field-sizing-content max-h-[30cqh] min-w-full
              flex-1 resize-none overflow-y-auto border-t-2 px-4 py-2
              outline-none"
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
          className="btn btn-primary h-auto self-stretch rounded-none
            rounded-r-xl px-6"
        >
          <span
            className="relative flex h-5.5 w-5.5 items-center justify-center"
          >
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
    </FormulaContextProvider>
  );
});

ChatForm.displayName = "DiceForm";
