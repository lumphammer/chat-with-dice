import { authClient } from "#/lib/auth-client";
import { Mail } from "lucide-react";
import { useState } from "react";

export function ChangeEmailSection({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);

    const { error: authError } = await authClient.changeEmail({
      newEmail,
      callbackURL: "/account",
    });

    setLoading(false);

    if (authError) {
      setError(
        authError.message ?? "Failed to send verification. Please try again.",
      );
      return;
    }

    setSent(true);
    setNewEmail("");
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-4">
        <div>
          <h2 className="card-title text-lg">Email address</h2>
          <p className="text-base-content/60 mt-0.5 text-sm">
            Current:{" "}
            <span className="text-base-content/80 font-medium">
              {currentEmail}
            </span>
          </p>
        </div>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {sent && (
          <div role="alert" className="alert alert-success text-sm">
            <span>
              Verification link sent! Check your new inbox and click the link to
              confirm the change.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">New email</legend>
            <label className="input w-full">
              <Mail size={16} className="opacity-50" />
              <input
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setSent(false);
                }}
                required
                disabled={loading}
              />
            </label>
          </fieldset>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            Send verification email
          </button>
        </form>
      </div>
    </div>
  );
}
