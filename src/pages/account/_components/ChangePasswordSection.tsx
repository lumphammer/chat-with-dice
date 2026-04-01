import { authClient } from "#/utils/auth-client";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

export function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: authError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });

    setLoading(false);

    if (authError) {
      setError(
        authError.message ?? "Failed to change password. Please try again.",
      );
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-4">
        <h2 className="card-title text-lg">Password</h2>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="alert" className="alert alert-success text-sm">
            <span>Password changed successfully.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Current password</legend>
            <label className="input w-full">
              <Lock size={16} className="opacity-50" />
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                tabIndex={-1}
                className="opacity-50 hover:opacity-100"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">New password</legend>
            <label className="input w-full">
              <Lock size={16} className="opacity-50" />
              <input
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
              <button
                type="button"
                tabIndex={-1}
                className="opacity-50 hover:opacity-100"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Confirm new password</legend>
            <label className="input w-full">
              <Lock size={16} className="opacity-50" />
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            Change password
          </button>
        </form>
      </div>
    </div>
  );
}
