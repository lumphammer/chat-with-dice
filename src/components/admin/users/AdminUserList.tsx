import { AdminUserRow } from "./AdminUserRow";
import type { UserWithRole } from "better-auth/client/plugins";
import { memo } from "react";

export const AdminUserList = memo(
  ({ users, total }: { users: UserWithRole[]; total: number }) => {
    return (
      <div className="p-4">
        <h2 className="mb-4 text-2xl font-bold">
          {total} User{total !== 1 ? "s" : ""}
        </h2>
        <div className="overflow-x-auto">
          <table className="table-zebra table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <AdminUserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
);

AdminUserList.displayName = "AdminUserList";
