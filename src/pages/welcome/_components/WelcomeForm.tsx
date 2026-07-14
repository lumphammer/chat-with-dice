import { authClient } from "#/auth/authClient.ts";
import { useStateWithRef } from "#/components/useStateWithRef";
import { generateRandomName } from "#/utils/generateRandomName";
import { Dice6, PartyPopper, User } from "lucide-react";
import { useEffect, useState } from "react";

function getSafeReturnUrl(): string {
  const raw =
    new URLSearchParams(window.location.search).get("returnUrl") ?? "/";
  // Only allow same-origin absolute paths. Reject protocol-relative URLs
  // (`//host`, and the `/\` variant some browsers normalise) which start with
  // "/" but navigate off-origin.
  return raw.startsWith("/") && !/^\/[/\\]/.test(raw) ? raw : "/";
}

export function WelcomeForm() {
  const { isPending, data: sessionData } = authClient.useSession();
  const [name, setName, nameRef] = useStateWithRef("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with the name the server generated for this account, once the
  // session has loaded.
  useEffect(() => {
    if (!isPending && nameRef.current === "") {
      setName(sessionData?.user.name ?? generateRandomName());
    }
  }, [isPending, sessionData, setName, nameRef]);

  function leave() {
    window.location.href = getSafeReturnUrl();
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await authClient.updateUser({ name });
    if (authError) {
      setError(
        authError.message ?? "Couldn't save your name. Please try again.",
      );
      setLoading(false);
      return;
    }
    leave();
  }

  return (
    <div className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className="bg-primary/15 flex size-14 items-center justify-center
              rounded-full"
          >
            <PartyPopper size={28} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold">Welcome to Chat with Dice!</h2>
          <p className="text-base-content/70">
            We've picked a display name for you. Keep it, edit it, or roll for a
            new one — you can always change it later.
          </p>
        </div>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Display name</legend>
            <div className="join w-full">
              <label className="input join-item flex-1">
                <User size={16} className="opacity-50" />
                <input
                  type="text"
                  placeholder="Adventurous Badger"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading || isPending}
                />
              </label>
              <button
                type="button"
                className="btn btn-neutral join-item"
                title="Generate random name"
                aria-label="Generate random name"
                onClick={() => setName(generateRandomName())}
                disabled={loading || isPending}
              >
                <Dice6 size={18} />
              </button>
            </div>
          </fieldset>

          <button
            type="submit"
            className="btn btn-primary mt-1 w-full"
            disabled={loading || isPending}
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            Save and continue
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={leave}
            disabled={loading}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
