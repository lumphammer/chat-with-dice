import type { UserWithRole } from "better-auth/client/plugins";
import { memo, useState } from "react";
import { authClient } from "#/utils/auth-client";

type Props = {
  user: UserWithRole;
  onUserUpdated: (user: UserWithRole) => void;
};

const SECONDS_PER_DAY = 86400;

const BanForm = ({ user, onUserUpdated }: Props) => {
  const [reason, setReason] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await authClient.admin.banUser({
      userId: user.id,
      ...(reason.trim() ? { banReason: reason.trim() } : {}),
      ...(expiresInDays
        ? { banExpiresIn: Number(expiresInDays) * SECONDS_PER_DAY }
        : {}),
    });
    setLoading(false);
    if (apiError || !data?.user) {
      setError(apiError?.message ?? "Failed to ban user.");
    } else {
      onUserUpdated(data.user as UserWithRole);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="label label-text text-xs" htmlFor="ban-reason">
            Reason (optional)
          </label>
          <input
            id="ban-reason"
            type="text"
            className="input input-bordered"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Repeated ToS violations"
          />
        </div>
        <div className="flex flex-col gap-1 w-36">
          <label className="label label-text text-xs" htmlFor="ban-expires">
            Expires in (days)
          </label>
          <input
            id="ban-expires"
            type="number"
            min="1"
            className="input input-bordered"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="Never"
          />
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div>
        <button type="submit" className="btn btn-error" disabled={loading}>
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Ban User"
          )}
        </button>
      </div>
    </form>
  );
};

const UnbanPanel = ({ user, onUserUpdated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnban = async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await authClient.admin.unbanUser({
      userId: user.id,
    });
    setLoading(false);
    if (apiError || !data?.user) {
      setError(apiError?.message ?? "Failed to unban user.");
    } else {
      onUserUpdated(data.user as UserWithRole);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm">
        <span className="text-base-content/60">Reason: </span>
        {user.banReason ?? <span className="text-base-content/50">—</span>}
      </div>
      <div className="text-sm">
        <span className="text-base-content/60">Expires: </span>
        {user.banExpires ? (
          user.banExpires.toLocaleString()
        ) : (
          <span className="text-base-content/50">Never</span>
        )}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleUnban}
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Unban User"
          )}
        </button>
      </div>
    </div>
  );
};

export const BanSection = memo(({ user, onUserUpdated }: Props) => (
  <div className="card bg-base-200">
    <div className="card-body">
      <h2 className="card-title text-base">
        {user.banned ? (
          <>
            <span className="badge badge-error">Banned</span>
          </>
        ) : (
          "Ban"
        )}
      </h2>
      {user.banned ? (
        <UnbanPanel user={user} onUserUpdated={onUserUpdated} />
      ) : (
        <BanForm user={user} onUserUpdated={onUserUpdated} />
      )}
    </div>
  </div>
));

BanSection.displayName = "BanSection";
