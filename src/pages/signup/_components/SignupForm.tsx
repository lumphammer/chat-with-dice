import { useStateWithRef } from "#/components/DiceRoller/hooks/useStateWithRef";
import { GithubIcon } from "#/components/GithubIcon";
import { GoogleIcon } from "#/components/GoogleIcon";
import { authClient } from "#/utils/auth-client";
import { generateRandomName } from "#/utils/generateRandomName";
import { Dice6, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";

type LoadingState = "idle" | "email" | "github" | "google";

export function SignupForm() {
  const { isPending, data: sessionData } = authClient.useSession();
  const [name, setName, nameRef] = useStateWithRef("");
  useEffect(() => {
    if (!isPending && nameRef.current === "") {
      setName(sessionData?.user.name ?? generateRandomName());
    }
  }, [isPending, sessionData, setName, nameRef]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
    } else {
      setDone(true);
    }
  }

  async function handleSocialSignIn(provider: "github" | "google") {
    setError(null);
    setLoading(provider);
    const { error: authError } = await authClient.signIn.social({ provider });
    if (authError) {
      setError(authError.message ?? "Sign-in failed. Please try again.");
      setLoading("idle");
    } else {
      // on success the browser is redirected by the OAuth flow
    }
  }

  if (done) {
    return (
      <div className="card bg-base-100 w-full max-w-md shadow-xl">
        <div className="card-body gap-4 text-center">
          <div
            className="bg-success/15 mx-auto flex size-14 items-center
              justify-center rounded-full"
          >
            <Mail size={28} className="text-success" />
          </div>
          <h2 className="text-xl font-bold">Check your inbox</h2>
          <p className="text-base-content/70 text-sm">
            We've sent a verification link to <strong>{email}</strong>. Click it
            to activate your account.
          </p>
          <p className="text-base-content/50 text-xs">
            Already verified?{" "}
            <a href="/signin" className="link link-primary">
              Sign in
            </a>
          </p>
        </div>
      </div>
    );
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
