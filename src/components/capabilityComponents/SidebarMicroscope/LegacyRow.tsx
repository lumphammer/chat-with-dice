import { microscopeClient } from "#/capabilities/microscope/client";
import type { Legacy } from "#/capabilities/microscope/common";
import { DeleteButton } from "../shared/DeleteButton";
import { TextEditDialog } from "./TextEditDialog";
import { PencilIcon } from "lucide-react";
import { memo, useState } from "react";

export const LegacyRow = memo(({ legacy }: { legacy: Legacy }) => {
  const capInfo = microscopeClient.useMount();
  const [isEditing, setIsEditing] = useState(false);

  if (!capInfo.initialised) {
    return null;
  }

  const { actions } = capInfo;

  return (
    <li className="list-row items-center px-2 py-1">
      <div className="list-col-grow wrap-break-word">{legacy.text}</div>
      <button
        type="button"
        className="muted hover:text-base-content shrink-0 cursor-pointer rounded
          p-1 transition-colors"
        aria-label={`Edit "${legacy.text}"`}
        onClick={() => setIsEditing(true)}
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <DeleteButton
        itemType="legacy"
        onDelete={() => actions.deleteLegacy({ id: legacy.id })}
      />
      <TextEditDialog
        open={isEditing}
        title="Edit this legacy"
        label="Legacy"
        initialValue={legacy.text}
        onClose={() => setIsEditing(false)}
        onSave={(text) => actions.editLegacy({ id: legacy.id, text })}
      />
    </li>
  );
});

LegacyRow.displayName = "LegacyRow";
