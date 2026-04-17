import { authClient } from "#/utils/auth-client";
import type { UserWithRole } from "better-auth/client/plugins";
import { memo, useState } from "react";

type Role = "user" | "admin";

type Props = {
  user: UserWithRole;
  onUserUpdated: (user: UserWithRole) => void;
};

export const SetRoleSection = memo(({ user, onUserUpdated }: Props) => {
  const [role, setRole] = useState<Role>(
    (user.role as Role | undefined) ?? "user",
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    const { data, error } = await authClient.admin.setRole({
      userId: user.id,
      role,
    });
    setLoading(false);
    if (error || !data?.user) {
      setFeedback({
        type: "error",
        message: error?.message ?? "Failed to set role.",
      });
    } else {
      onUserUpdated(data.user);
      setFeedback({ type: "success", message: "Role updated." });
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-base">Role</h2>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="label label-text text-xs" htmlFor="role-select">
              Role
            </label>
            <select
              id="role-select"
              className="select select-bordered w-full max-w-xs"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Save"
            )}
          </button>
        </form>
        {feedback && (
          <div
            className={`alert mt-2
            ${feedback.type === "success" ? "alert-success" : "alert-error"}`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
});

SetRoleSection.displayName = "SetRoleSection";
