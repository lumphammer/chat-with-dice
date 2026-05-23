import { authClient } from "#/utils/auth-client";
import { formatBytes } from "#/utils/formatBytes";
import { memo } from "react";

export const StorageQuotaSection = memo(() => {
  const session = authClient.useSession();
  const quotaBytes = session.data?.user.storageQuotaBytes ?? 0;
  const usedBytes = session.data?.user.storageUsedBytes ?? 0;
  const percentUsed = Math.max(
    1,
    quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0,
  );

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-4">
        <div>
          <h2 className="card-title text-lg">Storage Quota</h2>
          <progress
            className="progress w-full"
            value={percentUsed}
            max="100"
          ></progress>
          <p>
            {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
          </p>
        </div>
      </div>
    </div>
  );
});
