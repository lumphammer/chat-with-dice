import { adversariesCapability } from "#/capabilities/adversariesCapability";
import { ItemCard } from "#/components/capabilityComponents/shared/ItemCard";
import { ResilienceTracker } from "#/components/capabilityComponents/shared/ResilienceTracker";
import { AdversaryEditForm } from "./AdversaryEditForm";
import { useMemo } from "react";

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
    difficulty: number;
    startingResilience: number;
  }) => void;
}

export const AdversaryDisplay = ({
  adversary,
  onDelete,
  onSetResilience,
  onUpdateAdversary,
}: Props) => {
  const hasDifficulty = adversary.difficulty > 0;

  const badges = useMemo(
    () => (
      <>
        <span className="badge badge-warning badge-sm">
          Threat {adversary.threat}
        </span>
        {hasDifficulty && (
          <span className="badge badge-primary badge-sm">
            Difficulty {adversary.difficulty}
          </span>
        )}
      </>
    ),
    [adversary.threat, adversary.difficulty, hasDifficulty],
  );

  return (
    <ItemCard
      name={adversary.name}
      isCompleted={adversary.resilience <= 0}
      itemType="adversary"
      onDelete={onDelete}
      badges={badges}
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
