import { AdminUserDetailDialog } from "./AdminUserDetailDialog";
import { AdminUserRow } from "./AdminUserRow";
import type { UserWithRole } from "better-auth/client/plugins";
import { memo, useEffect, useRef, useState } from "react";

export const AdminUserList = memo(
  ({ users, total }: { users: UserWithRole[]; total: number }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

    const handleShowDetails = (user: UserWithRole) => {
      setSelectedUser(user);
    };

    useEffect(() => {
      if (selectedUser) {
        dialogRef.current?.showModal();
      }
    }, [selectedUser]);

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
                <AdminUserRow
                  key={user.id}
                  user={user}
                  onShowDetails={handleShowDetails}
                />
              ))}
            </tbody>
          </table>
        </div>
        <AdminUserDetailDialog dialogRef={dialogRef} user={selectedUser} />
      </div>
    );
  },
);

AdminUserList.displayName = "AdminUserList";
