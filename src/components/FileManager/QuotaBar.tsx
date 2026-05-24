import { memo } from "react";

const DANGER_THRESHOLD = 90;

export const QuotaBar = memo(
  ({ usedBytes, quotaBytes }: { usedBytes: number; quotaBytes: number }) => {
    const percentUsed = Math.max(
      1,
      quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0,
    );

    return (
      <progress
        className="progress data-danger:progress-error w-full"
        value={percentUsed}
        data-danger={percentUsed > DANGER_THRESHOLD ? true : undefined}
        max="100"
      ></progress>
    );
  },
);

QuotaBar.displayName = "QuotaBar";
