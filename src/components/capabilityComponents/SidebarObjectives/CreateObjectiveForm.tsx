import { objectivesCapability } from "#/capabilities/objectivesCapability";
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
      className="fieldset bg-base-100 border-base-content/50 rounded-box group
        my-4 w-full border p-2"
    >
      <summary className="cursor-pointer text-lg">Add objective</summary>
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
            className="input input-md input-primary w-full"
            value={newObjectiveName}
            onChange={(e) => setNewObjectiveName(e.target.value)}
          ></input>
        </label>
        <label className="floating-label mt-4">
          <span>Resilience</span>
          <input
            className="input input-md input-primary w-full"
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
          <span>Primary?</span>
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
