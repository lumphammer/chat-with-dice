import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

const DEFAULT_STARTING_RESILIENCE = 3;

export const CreateObjectiveForm = () => {
  const capInfo = objectivesCapability.useMount();
  if (!capInfo.initialised) {
    return null;
  }

  const [newObjectiveName, setNewObjectiveName] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [newStartingResilience, setNewStartingResilience] = useState(
    DEFAULT_STARTING_RESILIENCE,
  );

  return (
    <details
      className="bg-base-100 border-base-content/50 rounded-box group my-4
        w-full border p-2"
    >
      <summary
        className="hover:bg-base-200 flex cursor-pointer list-none items-center
          justify-between rounded px-1 py-0.5 text-lg transition-colors
          group-open:mb-4"
      >
        Add objective
        <ChevronDownIcon
          className="text-base-content/60 h-5 w-5 transition-transform
            duration-200 group-open:rotate-180"
        />
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          capInfo.actions.createObjective({
            isPrimary: newIsPrimary,
            name: newObjectiveName,
            startingResilience: newStartingResilience,
          });
          setNewIsPrimary(false);
          setNewObjectiveName("");
          setNewStartingResilience(DEFAULT_STARTING_RESILIENCE);
        }}
      >
        {/*<legend className="fieldset-legend">Add objective</legend>*/}

        <label className="floating-label">
          <span>Name</span>
          <input
            className="input input-md w-full"
            value={newObjectiveName}
            onChange={(e) => setNewObjectiveName(e.target.value)}
          ></input>
        </label>
        <label className="floating-label mt-4">
          <span>Resilience</span>
          <input
            className="input input-md w-full"
            type="number"
            value={newStartingResilience}
            onChange={(e) => setNewStartingResilience(Number(e.target.value))}
          ></input>
        </label>
        <label className="label mt-4">
          <input
            className="checkbox"
            type="checkbox"
            checked={newIsPrimary}
            onChange={(e) => setNewIsPrimary(e.target.checked)}
          ></input>
          <span className="text-base-content text-sm">Primary?</span>
        </label>

        <button
          className="btn btn-primary mt-2 w-full"
          type="submit"
          disabled={!newObjectiveName}
        >
          Add
        </button>
      </form>
    </details>
  );
};
