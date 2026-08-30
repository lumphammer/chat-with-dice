import { microscopeClient } from "#/capabilities/microscope/client";
import { SidebarPanel } from "../shared/SidebarPanel";
import { LegacyRow } from "./LegacyRow";
import { TextEditDialog } from "./TextEditDialog";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { memo, useState } from "react";

/**
 * The legacy list: flat, untoned, and in the order it was written. No nesting
 * and no dragging, because a Legacy isn't part of the timeline — it is a thread
 * the table has agreed to keep pulling on.
 */
export const SidebarMicroscopeLegacies = memo(() => {
  const capInfo = microscopeClient.useMount();
  const [isCreating, setIsCreating] = useState(false);

  const legacies = capInfo.initialised ? capInfo.state.legacies : null;

  return (
    <SidebarPanel
      title="Legacies"
      isSaving={capInfo.initialised && capInfo.patches.length > 0}
    >
      <p className="muted text-sm">
        The threads this history keeps coming back to. Anyone may make one, and
        anyone may pick one up in a legacy phase.
      </p>

      {legacies === null && <p>Loading…</p>}
      {legacies !== null && legacies.length === 0 && (
        <p className="muted text-sm">No legacies yet.</p>
      )}
      {legacies !== null && legacies.length > 0 && (
        <ul className="list gap-0">
          {legacies.map((legacy) => (
            <LegacyRow key={legacy.id} legacy={legacy} />
          ))}
        </ul>
      )}

      <div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!capInfo.initialised}
          onClick={() => setIsCreating(true)}
        >
          <Plus size={16} />
          New legacy
        </button>
      </div>

      <TextEditDialog
        open={isCreating}
        title="New legacy"
        label="Legacy"
        placeholder="e.g. the drowned city and what it still wants"
        initialValue=""
        onClose={() => setIsCreating(false)}
        onSave={(text) => {
          if (!capInfo.initialised) {
            return;
          }
          capInfo.actions.createLegacy({ id: nanoid(), text });
        }}
      />
    </SidebarPanel>
  );
});

SidebarMicroscopeLegacies.displayName = "SidebarMicroscopeLegacies";
