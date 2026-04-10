import { adversariesCapability } from "#/capabilities/adversariesCapability";
import { ItemCard } from "#/components/capabilityComponents/shared/ItemCard";
import { ResilienceTracker } from "#/components/capabilityComponents/shared/ResilienceTracker";
import { AdversaryEditForm } from "./AdversaryEditForm";

type MountedCapInfo = Extract<
  ReturnType<typeof adversariesCapability.useMount>,
  { initialised: true }
>;
export type Adversary = MountedCapInfo["state"]["adversaries"][number];

interface Props {
  adversary: Adversary;
  onDelete: () => void;
  onSetResilience: (resilience: number) => void;
  onUpdateAdversary: (update: {
    name: string;
    threat: number;
    startingResilience: number;
  }) => void;
}

export const AdversaryDisplay = ({
  adversary,
  onDelete,
  onSetResilience,
  onUpdateAdversary,
}: Props) => {
  const threatBadge = (
    <span className="badge badge-warning badge-sm">
      Threat {adversary.threat}
    </span>
  );

  return (
    <ItemCard
      name={adversary.name}
      isCompleted={adversary.resilience <= 0}
      itemType="adversary"
      onDelete={onDelete}
      badges={threatBadge}
      renderEditForm={({ onDone }) => (
        <AdversaryEditForm
          adversary={adversary}
          onSave={(update) => {
            onUpdateAdversary(update);
            onDone();
          }}
          onCancel={onDone}
        />
      )}
    >
      <ResilienceTracker
        startingResilience={adversary.startingResilience}
        resilience={adversary.resilience}
        onSetResilience={onSetResilience}
      />
    </ItemCard>
  );
};
