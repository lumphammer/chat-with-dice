import { authClient } from "#/utils/auth-client";
import { KeyRound, Lock, Mail } from "lucide-react";
import { useState } from "react";

type Step = "email" | "otp" | "done";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await authClient.emailOtp.requestPasswordReset(
      { email },
    );

    setLoading(false);

    if (authError) {
      setError(authError.message ?? "Failed to send code. Please try again.");
      return;
    }

    setStep("otp");
  }

  async function handleOtpSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: authError } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(
        authError.message ?? "Failed to reset password. Please try again.",
      );
      return;
    }

    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="card bg-base-100 w-full max-w-md shadow-xl">
        <div className="card-body gap-4 text-center">
          <div
            className="bg-success/15 mx-auto flex size-14 items-center
              justify-center rounded-full"
          >
            <KeyRound size={28} className="text-success" />
          </div>
          <h2 className="text-xl font-bold">Password updated!</h2>
          <p className="text-base-content/70 text-sm">
            Your password has been reset successfully.
          </p>
          <a href="/signin" className="btn btn-primary w-full">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body gap-4">
        <div>
          <h2 className="text-xl font-bold">Reset your password</h2>
          <p className="text-base-content/70 mt-1 text-sm">
            {step === "email"
              ? "Enter your email address and we'll send you a reset code."
              : `Enter the 6-digit code we sent to ${email}, then choose a new password.`}
          </p>
        </div>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email</legend>
              <label className="input w-full">
                <Mail size={16} className="opacity-50" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </label>
            </fieldset>

            <button
              type="submit"
              className="btn btn-primary mt-1 w-full"
              disabled={loading}
            >
              {loading && (
                <span className="loading loading-spinner loading-sm" />
              )}
              Send reset code
            </button>

            <p className="text-center text-sm">
              <a href="/signin" className="link link-primary">
                Back to sign in
              </a>
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Reset code</legend>
              <label className="input w-full font-mono tracking-widest">
                <KeyRound size={16} className="opacity-50" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={loading}
                />
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">New password</legend>
              <label className="input w-full">
                <Lock size={16} className="opacity-50" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
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
              className="btn btn-primary mt-1 w-full"
              disabled={loading}
            >
              {loading && (
                <span className="loading loading-spinner loading-sm" />
              )}
              Reset password
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="link link-primary"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
              >
                Use a different email
              </button>
              <button
                type="button"
                className="link link-neutral opacity-60"
                disabled={loading}
                onClick={async () => {
                  setError(null);
                  const { error: resendError } =
                    await authClient.emailOtp.requestPasswordReset({
                      email,
                    });
                  if (resendError) {
                    setError(resendError.message ?? "Failed to resend code.");
                  }
                }}
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
