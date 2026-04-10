import { useState } from "react";

interface AdversaryData {
  name: string;
  threat: number;
  startingResilience: number;
}

interface Props {
  adversary: AdversaryData;
  onSave: (update: AdversaryData) => void;
  onCancel: () => void;
}

export const AdversaryEditForm = ({ adversary, onSave, onCancel }: Props) => {
  const [name, setName] = useState(adversary.name);
  const [threat, setThreat] = useState(adversary.threat);
  const [startingResilience, setStartingResilience] = useState(
    adversary.startingResilience,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, threat, startingResilience });
      }}
    >
      <label className="floating-label">
        <span>Name</span>
        <input
          className="input input-sm w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="floating-label">
          <span>Threat</span>
          <input
            className="input input-sm w-full"
            type="number"
            min={0}
            value={threat}
            onChange={(e) => setThreat(Number(e.target.value))}
          />
        </label>
        <label className="floating-label">
          <span>Starting Resilience</span>
          <input
            className="input input-sm w-full"
            type="number"
            min={1}
            value={startingResilience}
            onChange={(e) => setStartingResilience(Number(e.target.value))}
          />
        </label>
      </div>

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
