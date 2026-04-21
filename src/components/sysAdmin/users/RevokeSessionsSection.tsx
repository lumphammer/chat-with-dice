import { authClient } from "#/utils/auth-client";
import { memo, useState } from "react";

export const RevokeSessionsSection = memo(({ userId }: { userId: string }) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleRevoke = async () => {
    setLoading(true);
    setFeedback(null);
    const { error } = await authClient.admin.revokeUserSessions({
      userId,
    });
    setLoading(false);
    if (error) {
      setFeedback({
        type: "error",
        message: error.message ?? "Failed to revoke sessions.",
      });
    } else {
      setFeedback({ type: "success", message: "All sessions revoked." });
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-base">Sessions</h2>
        <p className="text-base-content/70 text-sm">
          Force the user to sign out of all active sessions.
        </p>
        <div className="flex flex-col gap-2">
          <div>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleRevoke}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Revoke All Sessions"
              )}
            </button>
          </div>
          {feedback && (
            <div
              className={`alert
              ${feedback.type === "success" ? "alert-success" : "alert-error"}`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

RevokeSessionsSection.displayName = "RevokeSessionsSection";
