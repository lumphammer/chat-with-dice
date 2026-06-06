import type { User } from "#/auth/auth.ts";
import { authClient } from "#/auth/authClient.ts";
import { isAdminOrBetter } from "#/utils/isAdminOrBetter.ts";
import { memo, useState } from "react";

type Props = {
  user: User;
  onUserUpdated: (user: User) => void;
};

const SECONDS_PER_DAY = 86400;

const BanForm = ({ user, onUserUpdated }: Props) => {
  const session = authClient.useSession();
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
      // types for user admin don't include additional fields
      // https://github.com/better-auth/better-auth/issues/6318
      onUserUpdated(data.user as User);
    }
  };

  const canBan = isAdminOrBetter(session.data?.user.role);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="label label-text text-xs" htmlFor="ban-reason">
            Reason (optional)
          </label>
          <input
            disabled={!canBan}
            id="ban-reason"
            type="text"
            className="input input-bordered"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Repeated ToS violations"
          />
        </div>
        <div className="flex w-36 flex-col gap-1">
          <label className="label label-text text-xs" htmlFor="ban-expires">
            Expires in (days)
          </label>
          <input
            disabled={!canBan}
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
        <button
          disabled={loading || !canBan}
          type="submit"
          className="btn btn-error"
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Ban User"
          )}
        </button>
      </div>
      {!canBan && (
        <p className="alert alert-info">
          You do not have permission to ban or unban this user.
        </p>
      )}
    </form>
  );
};

const UnbanPanel = ({ user, onUserUpdated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = authClient.useSession();

  const canBan = isAdminOrBetter(session.data?.user.role);

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
      // types for user admin don't include additional fields
      // https://github.com/better-auth/better-auth/issues/6318
      onUserUpdated(data.user as User);
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
          disabled={loading || !canBan}
          type="button"
          className="btn btn-error"
          onClick={handleUnban}
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
