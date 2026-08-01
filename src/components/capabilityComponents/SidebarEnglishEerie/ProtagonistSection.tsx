import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { ProtagonistEditDialog } from "./ProtagonistEditDialog";
import { ProtagonistSummary } from "./ProtagonistSummary";
import { PencilIcon } from "lucide-react";
import { useState } from "react";

export const ProtagonistSection = () => {
  const capInfo = englisheerieClient.useMount();
  const [isEditing, setIsEditing] = useState(false);

  if (!capInfo.initialised) {
    return null;
  }

  const { protagonist } = capInfo.state;

  return (
    <section>
      <h3 className="heading grow">The Protagonist</h3>

      <ProtagonistSummary protagonist={protagonist} />
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="btn btn-primary btn-sm"
        aria-label="Edit the protagonist"
      >
        <PencilIcon className="h-4 w-4" /> Edit
      </button>

      <ProtagonistEditDialog
        protagonist={protagonist}
        open={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={(next) => capInfo.actions.setProtagonist(next)}
      />
    </section>
  );
};
