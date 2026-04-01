import { authClient } from "#/utils/auth-client";
import { generateRandomName } from "#/utils/generateRandomName";
import { Dice6, User } from "lucide-react";
import { useState } from "react";

export function ChangeNameSection({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const { error: authError } = await authClient.updateUser({ name });

    setLoading(false);

    if (authError) {
      setError(authError.message ?? "Failed to update name. Please try again.");
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-4">
        <h2 className="card-title text-lg">Display name</h2>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="alert" className="alert alert-success text-sm">
            <span>Display name updated.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name</legend>
            <div className="join w-full">
              <label className="input join-item flex-1">
                <User size={16} className="opacity-50" />
                <input
                  type="text"
                  placeholder="Adventurous Badger"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSuccess(false);
                  }}
                  required
                  disabled={loading}
                />
              </label>
              <button
                type="button"
                className="btn btn-neutral join-item"
                title="Generate random name"
                aria-label="Generate random name"
                onClick={() => {
                  setName(generateRandomName());
                  setSuccess(false);
                }}
                disabled={loading}
              >
                <Dice6 size={18} />
              </button>
            </div>
          </fieldset>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading || name === currentName}
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            Save name
          </button>
        </form>
      </div>
    </div>
  );
}
