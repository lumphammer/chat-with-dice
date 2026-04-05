import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { ChevronDownIcon } from "lucide-react";
import { useRef, useState } from "react";

const DEFAULT_STARTING_RESILIENCE = 3;
const DEFAULT_DIFFICULTY = 0;

export const CreateObjectiveForm = () => {
  const capInfo = objectivesCapability.useMount();

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

  const nameInputRef = useRef<HTMLInputElement>(null);

  return (
    <details
      className="bg-base-100 border-base-content/50 open:border-primary
        rounded-box group has-[summary:hover]:border-primary my-4 w-full border
        p-2 transition-colors duration-200"
      onToggle={(e) => {
        if (e.currentTarget.open) {
          nameInputRef.current?.focus();
        }
      }}
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between
          rounded px-1 py-0.5 text-lg transition-colors group-open:mb-4"
      >
        Add objective
        <ChevronDownIcon
          className="text-base-content/60 h-5 w-5 transition-transform
            duration-200 group-open:rotate-180"
        />
      </summary>

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
    </details>
  );
};
