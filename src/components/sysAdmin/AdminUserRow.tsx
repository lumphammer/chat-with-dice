import type { UserWithRole } from "better-auth/client/plugins";
import { InfoIcon } from "lucide-react";
import { memo } from "react";

type Props = {
  user: UserWithRole;
  onShowDetails: (user: UserWithRole) => void;
};

export const AdminUserRow = memo(({ user, onShowDetails }: Props) => {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-2">
          {user.image && (
            <img
              src={user.image}
              alt={user.name ?? ""}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <span>{user.name ?? "—"}</span>
        </div>
      </td>
      <td>{user.email}</td>
      <td>
        {user.role ? (
          <span className="badge badge-primary">{user.role}</span>
        ) : (
          <span className="badge badge-ghost">user</span>
        )}
      </td>
      <td>
        {user.banned ? (
          <span className="badge badge-error">Banned</span>
        ) : (
          <span className="badge badge-success">Active</span>
        )}
      </td>
      <td>{user.createdAt.toLocaleDateString()}</td>
      <td>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => onShowDetails(user)}
          aria-label={`Show details for ${user.name ?? user.email}`}
        >
          <InfoIcon className="h-4 w-4" />
          Details
        </button>
      </td>
    </tr>
  );
});

AdminUserRow.displayName = "AdminUserRow";
