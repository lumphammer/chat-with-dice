import { BanSection } from "./BanSection";
import { RevokeSessionsSection } from "./RevokeSessionsSection";
import { SetRoleSection } from "./SetRoleSection";
import { UserInfoPanel } from "./UserInfoPanel";
import type { UserWithRole } from "better-auth/client/plugins";
import { memo, useState } from "react";

export const UserDetailPage = memo(
  ({ user: initialUser }: { user: UserWithRole }) => {
    const [user, setUser] = useState(initialUser);

    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <UserInfoPanel user={user} />
        <SetRoleSection user={user} onUserUpdated={setUser} />
        <BanSection user={user} onUserUpdated={setUser} />
        <RevokeSessionsSection userId={user.id} />
      </div>
    );
  },
);

UserDetailPage.displayName = "UserDetailPage";
