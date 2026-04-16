// import { authClient } from "#/utils/auth-client";
import type { UserWithRole } from "better-auth/client/plugins";
import { memo } from "react";

export const AdminRoomList = memo(
  ({ users, total }: { users: UserWithRole[]; total: number }) => {
    // const users = authClient.admin.listUsers({ query: {} });

    return (
      <div className="prose p-4">
        <h2>
          {total} User{total !== 1 ? "s" : ""}
        </h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </div>
    );
  },
);

AdminRoomList.displayName = "AdminRoomList";
