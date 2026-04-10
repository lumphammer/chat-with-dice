import { adversariesCapability } from "#/capabilities/adversariesCapability";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { CreateAdversaryForm } from "./CreateAdversaryForm";
import { AdversaryDisplay } from "./AdversaryDisplay";
import { memo } from "react";

export const SidebarAdversaries = memo(() => {
  const capInfo = adversariesCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Adversaries" isSaving={capInfo.patches.length > 0}>
      <CreateAdversaryForm />
      {capInfo.state.adversaries.map((adversary) => (
        <AdversaryDisplay
          key={adversary.id}
          adversary={adversary}
          onDelete={() => capInfo.actions.deleteAdversary({ id: adversary.id })}
          onSetResilience={(resilience) =>
            capInfo.actions.setResilience({ id: adversary.id, resilience })
          }
          onUpdateAdversary={(update) =>
            capInfo.actions.updateAdversary({ id: adversary.id, ...update })
          }
        />
      ))}
    </SidebarPanel>
  );
});
