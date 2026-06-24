import { authClient } from "#/auth/authClient.ts";
import { DiscordIcon } from "#/components/DiscordIcon";
import { GithubIcon } from "#/components/GithubIcon";
import { GoogleIcon } from "#/components/GoogleIcon";
import { Mail } from "lucide-react";
import { useState } from "react";

type LoadingState = "idle" | "email" | "github" | "google" | "discord";

function getSafeReturnUrl(): string {
  const raw =
    new URLSearchParams(window.location.search).get("returnUrl") ?? "/";
  // Only allow same-origin absolute paths. Reject protocol-relative URLs
  // (`//host`, and the `/\` variant some browsers normalise) which start with
  // "/" but navigate off-origin.
  return raw.startsWith("/") && !/^\/[/\\]/.test(raw) ? raw : "/";
}

// First-time users are routed here after clicking their link so they can
// confirm or edit the display name we generated for them. Returning users go
// straight to their return URL instead.
function getNewUserCallbackUrl(returnUrl: string): string {
  return returnUrl === "/"
    ? "/welcome"
    : `/welcome?returnUrl=${encodeURIComponent(returnUrl)}`;
}

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isLoading = loading !== "idle";

  async function handleEmailSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading("email");

    const returnUrl = getSafeReturnUrl();
    const { error: authError } = await authClient.signIn.magicLink({
      email,
      callbackURL: returnUrl,
      newUserCallbackURL: getNewUserCallbackUrl(returnUrl),
    });

    setLoading("idle");

    if (authError) {
      setError(authError.message ?? "Something went wrong. Please try again.");
    } else {
      // Shown regardless of whether the email belongs to an existing account,
      // so the response can't be used to probe which emails are registered.
      setSent(true);
    }
  }

  async function handleSocialSignIn(provider: "github" | "google" | "discord") {
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

  if (sent) {
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
            We've sent a sign-in link to <strong>{email}</strong>. Click it to
            sign in. The link expires shortly and can only be used once.
          </p>
          <p className="text-base-content/50 text-xs">
            Didn't get it? Check your spam folder, or{" "}
            <button
              type="button"
              className="link link-primary"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
            >
              try again
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body gap-4">
        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

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

          <button
            type="button"
            className="btn btn-neutral w-full"
            onClick={() => handleSocialSignIn("discord")}
            disabled={isLoading}
          >
            {loading === "discord" ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <DiscordIcon />
            )}
            Continue with Discord
          </button>
        </div>

        <div className="divider text-xs">or sign in with email</div>

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

          <button
            type="submit"
            className="btn btn-primary mt-1 w-full"
            disabled={isLoading}
          >
            {loading === "email" && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Send sign-in link
          </button>

          <p className="text-base-content/60 text-center text-xs">
            We'll email you a link to sign in. No password needed.
          </p>
        </form>
      </div>
    </div>
  );
}
