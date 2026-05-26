import type { User } from "#/auth";
import { BanSection } from "./BanSection";
import { RevokeSessionsSection } from "./RevokeSessionsSection";
import { SetQuotaSection } from "./SetQuotaSection";
import { SetRoleSection } from "./SetRoleSection";
import { StorageReportsSection } from "./StorageReportsSection";
import { UserInfoPanel } from "./UserInfoPanel";
import { memo, useState } from "react";

export const UserDetailPage = memo(({ user: initialUser }: { user: User }) => {
  const [user, setUser] = useState(initialUser);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <UserInfoPanel user={user} />
      <SetRoleSection user={user} onUserUpdated={setUser} />
      <SetQuotaSection
        userId={user.id}
        usedBytes={user.storageUsedBytes}
        initialQuotaBytes={user.storageQuotaBytes}
        isAnonymous={user.isAnonymous ?? true}
      />
      <StorageReportsSection userId={user.id} />
      <BanSection user={user} onUserUpdated={setUser} />
      <RevokeSessionsSection userId={user.id} />
    </div>
  );
});

UserDetailPage.displayName = "UserDetailPage";
