import { microscopeClient } from "#/capabilities/microscope/client";
import { ItemEditDialog, type ItemDraft } from "./ItemEditDialog";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { memo, useState } from "react";

const EMPTY_DRAFT: ItemDraft = { tone: "light", text: "", answer: "" };

/**
 * The one way in that isn't a card menu — there has to be something to press
 * when the timeline is still empty. Adds at the end; the bookends get their
 * order sorted out by moving or by making the next one "before".
 */
export const NewPeriodButton = memo(() => {
  const capInfo = microscopeClient.useMount();
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = (draft: ItemDraft) => {
    if (!capInfo.initialised) {
      return;
    }
    capInfo.actions.createItem({
      id: nanoid(),
      placement: { relation: "in", targetId: null },
      tone: draft.tone,
      text: draft.text,
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-sm mt-4"
        disabled={!capInfo.initialised}
        onClick={() => setIsOpen(true)}
      >
        <Plus size={16} />
        New period
      </button>
      <ItemEditDialog
        open={isOpen}
        kind="period"
        title="New period"
        initialValues={EMPTY_DRAFT}
        showAnswer={false}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
      />
    </>
  );
});

NewPeriodButton.displayName = "NewPeriodButton";
