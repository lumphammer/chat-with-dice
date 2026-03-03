import { authClient } from "@/lib/auth-client";
import { generateRandomName } from "@/lib/generateRandomName";
import { Dice6, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";

type LoadingState = "idle" | "email" | "github" | "google";

export function SignupForm() {
  const [name, setName] = useState(() => generateRandomName());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const isLoading = loading !== "idle";

  async function handleEmailSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading("email");
    const { error: authError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (authError) {
      setError(authError.message ?? "Sign-up failed. Please try again.");
      setLoading("idle");
      return;
    }

    window.location.href = "/";
  }

  async function handleSocialSignIn(provider: "github" | "google") {
    setError(null);
    setLoading(provider);
    const { error: authError } = await authClient.signIn.social({ provider });
    if (authError) {
      setError(authError.message ?? "Sign-in failed. Please try again.");
      setLoading("idle");
    }
    // on success the browser is redirected by the OAuth flow
  }

  return (
    <div className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body gap-4">
        <p className="text-center text-sm font-medium">
          Already have an account?{" "}
          <a href="/signin" className="link link-primary font-semibold">
            Sign in
          </a>
        </p>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          {/* Name */}
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
                  disabled={isLoading}
                />
              </label>
              <button
                type="button"
                className="btn btn-neutral join-item"
                title="Generate random name"
                aria-label="Generate random name"
                onClick={() => setName(generateRandomName())}
                disabled={isLoading}
              >
                <Dice6 size={18} />
              </button>
            </div>
          </fieldset>

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

          {/* Confirm password */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Confirm password</legend>
            <label className="input w-full">
              <Lock size={16} className="opacity-50" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                tabIndex={-1}
                className="opacity-50 hover:opacity-100"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
            Create account
          </button>
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
            className="btn btn-outline w-full"
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

// Inline GitHub Invertocat mark — avoids deprecated lucide Github icon
function GithubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

// Inline Google "G" logo — avoids any external image dependency
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
