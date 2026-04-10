import { adversariesCapability } from "#/capabilities/adversariesCapability";
import { ExpandableForm } from "#/components/capabilityComponents/shared/ExpandableForm";
import { useRef, useState } from "react";

const DEFAULT_STARTING_RESILIENCE = 3;
const DEFAULT_THREAT = 1;

export const CreateAdversaryForm = () => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const capInfo = adversariesCapability.useMount();

  const [name, setName] = useState("");
  const [threat, setThreat] = useState(DEFAULT_THREAT);
  const [startingResilience, setStartingResilience] = useState(
    DEFAULT_STARTING_RESILIENCE,
  );

  if (!capInfo.initialised) {
    return null;
  }

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    capInfo.actions.createAdversary({ name, threat, startingResilience });
    setName("");
    setThreat(DEFAULT_THREAT);
    setStartingResilience(DEFAULT_STARTING_RESILIENCE);
  };

  return (
    <ExpandableForm
      label="Add adversary"
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
            <span>Threat</span>
            <input
              className="input w-full"
              type="number"
              min={0}
              value={threat}
              onChange={(e) => setThreat(Number(e.target.value))}
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
