import { GithubIcon } from "#/components/GithubIcon";
import { GoogleIcon } from "#/components/GoogleIcon";
import { authClient } from "#/utils/auth-client";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";

const HTTP_FORBIDDEN = 403;

type LoadingState = "idle" | "email" | "github" | "google";

function getSafeReturnUrl(): string {
  const raw =
    new URLSearchParams(window.location.search).get("returnUrl") ?? "/";
  return raw.startsWith("/") ? raw : "/";
}

export function SigninForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const isLoading = loading !== "idle";

  async function handleEmailSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setEmailNotVerified(false);
    setResendSent(false);
    setLoading("email");

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    if (authError) {
      if (authError.status === HTTP_FORBIDDEN) {
        setEmailNotVerified(true);
      } else {
        setError(authError.message ?? "Sign-in failed. Please try again.");
      }
      setLoading("idle");
      return;
    } else {
      window.location.href = getSafeReturnUrl();
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    await authClient.sendVerificationEmail({ email, callbackURL: "/" });
    setResendLoading(false);
    setResendSent(true);
  }

  async function handleSocialSignIn(provider: "github" | "google") {
    setError(null);
    setLoading(provider);
    const { error: authError } = await authClient.signIn.social({
      provider,
      callbackURL: getSafeReturnUrl(),
    });
    if (authError) {
      setError(authError.message ?? "Sign-in failed. Please try again.");
      setLoading("idle");
    } else {
      // on success the browser is redirected by the OAuth flow
    }
  }

  return (
    <div className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body gap-4">
        <p className="text-center text-sm font-medium">
          Don't have an account?{" "}
          <a href="/signup" className="link link-primary font-semibold">
            Sign up
          </a>
        </p>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {emailNotVerified && (
          <div
            role="alert"
            className="alert alert-warning flex-col items-start gap-2 text-sm"
          >
            <span>Please verify your email address before signing in.</span>
            <button
              type="button"
              className="btn btn-xs btn-warning"
              disabled={resendLoading || resendSent}
              onClick={handleResendVerification}
            >
              {resendLoading && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {resendSent ? "Email sent!" : "Resend verification email"}
            </button>
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          {/* Email */}
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
                disabled={isLoading}
              />
            </label>
          </fieldset>

          {/* Password */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Password</legend>
            <label className="input w-full">
              <Lock size={16} className="opacity-50" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                tabIndex={-1}
                className="opacity-50 hover:opacity-100"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>
          </fieldset>

          <button
            type="submit"
            className="btn btn-primary mt-1 w-full"
            disabled={isLoading}
          >
            {loading === "email" && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Sign in
          </button>

          <div className="text-right text-sm">
            <a href="/forgot-password" className="link link-primary opacity-70">
              Forgot password?
            </a>
          </div>
        </form>

        <div className="divider text-xs">or</div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn btn-neutral w-full"
            onClick={() => handleSocialSignIn("github")}
            disabled={isLoading}
          >
            {loading === "github" ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <GithubIcon />
            )}
            Continue with GitHub
          </button>

          <button
            type="button"
            className="btn btn-neutral w-full"
            onClick={() => handleSocialSignIn("google")}
            disabled={isLoading}
          >
            {loading === "google" ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
