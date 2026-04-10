import { DeleteButton } from "./DeleteButton";
import { Check, PencilIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

interface Props {
  name: string;
  isCompleted: boolean;
  itemType?: string;
  onDelete: () => void;
  badges?: ReactNode;
  renderEditForm: (props: { onDone: () => void }) => ReactNode;
  children: ReactNode;
}

export const ItemCard = ({
  name,
  isCompleted,
  itemType,
  onDelete,
  badges,
  renderEditForm,
  children,
}: Props) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className="border-base-content/60 data-editing:border-primary rounded-box
        my-4 border p-3 data-completed:opacity-50"
      data-editing={isEditing ? "" : undefined}
      data-completed={!isEditing && isCompleted ? "" : undefined}
    >
      {isEditing ? (
        renderEditForm({ onDone: () => setIsEditing(false) })
      ) : (
        <>
          <div className="mb-1 flex items-start gap-2">
            <h3 className="min-w-0 grow font-semibold">
              {name}
              {isCompleted && <Check className="inline" />}
            </h3>
            <DeleteButton onDelete={onDelete} itemType={itemType} />
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-base-content/50 hover:text-base-content -mr-1
                shrink-0 rounded p-1 transition-colors"
              aria-label={`Edit ${itemType ?? "item"}`}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
          {badges && <div className="mb-2 flex gap-1">{badges}</div>}
          {children}
        </>
      )}
    </div>
  );
};
