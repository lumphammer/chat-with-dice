import { objectivesClient } from "#/capabilities/objectives/client";
import { ExpandableForm } from "#/components/capabilityComponents/shared/ExpandableForm";
import { useRef, useState } from "react";

const DEFAULT_STARTING_RESILIENCE = 3;
const DEFAULT_DIFFICULTY = 0;

export const CreateObjectiveForm = () => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const capInfo = objectivesClient.useMount();

  const [name, setName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [startingResilience, setStartingResilience] = useState(
    DEFAULT_STARTING_RESILIENCE,
  );

  if (!capInfo.initialised) {
    return null;
  }

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    capInfo.actions.createObjective({
      name,
      isPrimary,
      difficulty,
      startingResilience,
    });
    setName("");
    setIsPrimary(false);
    setDifficulty(DEFAULT_DIFFICULTY);
    setStartingResilience(DEFAULT_STARTING_RESILIENCE);
  };

  return (
    <ExpandableForm
      label="Add objective"
      onOpen={() => nameInputRef.current?.focus()}
    >
      <form onSubmit={handleSubmit}>
        <label className="floating-label">
          <span>Name</span>
          <input
            ref={nameInputRef}
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="floating-label">
            <span>Difficulty</span>
            <input
              className="input w-full"
              type="number"
              min={0}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
          </label>
          <label className="floating-label">
            <span>Starting Resilience</span>
            <input
              className="input w-full"
              type="number"
              min={1}
              value={startingResilience}
              onChange={(e) => setStartingResilience(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="label mt-4 cursor-pointer justify-start gap-2">
          <input
            className="checkbox"
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          <span className="text-base-content text-sm">Primary</span>
        </label>

        <button
          className="btn btn-primary btn-sm mt-4 w-full"
          type="submit"
          disabled={!name}
        >
          Add
        </button>
      </form>
    </ExpandableForm>
  );
};
