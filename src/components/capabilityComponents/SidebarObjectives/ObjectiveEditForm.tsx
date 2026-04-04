import type { Objective } from "./ObjectiveDisplay";
import { useState } from "react";

interface SavePayload {
  name: string;
  isPrimary: boolean;
  difficulty: number;
  startingResilience: number;
}

interface Props {
  objective: Objective;
  onSave: (update: SavePayload) => void;
  onCancel: () => void;
}

export const ObjectiveEditForm = ({ objective, onSave, onCancel }: Props) => {
  const [name, setName] = useState(objective.name);
  const [isPrimary, setIsPrimary] = useState(objective.isPrimary);
  const [difficulty, setDifficulty] = useState(objective.difficulty);
  const [startingResilience, setStartingResilience] = useState(
    objective.startingResilience,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, isPrimary, difficulty, startingResilience });
      }}
    >
      <label className="floating-label">
        <span>Name</span>
        <input
          className="input input-sm input-primary w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="floating-label">
          <span>Difficulty</span>
          <input
            className="input input-sm input-primary w-full"
            type="number"
            min={0}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          />
        </label>
        <label className="floating-label">
          <span>Starting Resilience</span>
          <input
            className="input input-sm input-primary w-full"
            type="number"
            min={1}
            value={startingResilience}
            onChange={(e) => setStartingResilience(Number(e.target.value))}
          />
        </label>
      </div>

      <label className="label mt-4 cursor-pointer justify-start gap-2">
        <input
          className="checkbox checkbox-sm"
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
        />
        <span className="text-base-content text-sm">Primary</span>
      </label>

      <div className="mt-4 flex gap-2">
        <button
          className="btn btn-sm btn-primary flex-1"
          type="submit"
          disabled={!name}
        >
          Save
        </button>
        <button
          className="btn btn-sm btn-ghost flex-1"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
