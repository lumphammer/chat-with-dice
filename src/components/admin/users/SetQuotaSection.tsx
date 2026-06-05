import { formatBytes } from "#/utils/formatBytes";
import { actions } from "astro:actions";
import { memo, useState } from "react";

// Binary GB so the labels match formatBytes output (1 GB === 1024 ** 3 bytes).
const QUOTA_OPTIONS = [
  { bytes: 0, label: "0" },
  { bytes: 1_073_741_824, label: "1 GB" },
  { bytes: 10_737_418_240, label: "10 GB" },
  { bytes: 107_374_182_400, label: "100 GB" },
];

export const SetQuotaSection = memo(
  ({
    userId,
    usedBytes,
    initialQuotaBytes,
    isAnonymous,
  }: {
    userId: string;
    usedBytes: number;
    initialQuotaBytes: number;
    isAnonymous: boolean;
  }) => {
    const [quotaBytes, setQuotaBytes] = useState(initialQuotaBytes);
    const [selected, setSelected] = useState(String(initialQuotaBytes));
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{
      type: "success" | "error";
      message: string;
    } | null>(null);

    const percentUsed =
      quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

    const handleSubmit = async (e: { preventDefault(): void }) => {
      e.preventDefault();
      setLoading(true);
      setFeedback(null);
      const { error } = await actions.admin.updateUserQuota({
        userId,
        storageQuotaBytes: Number(selected),
      });
      setLoading(false);
      if (error) {
        setFeedback({
          type: "error",
          message: error.message ?? "Failed to update quota.",
        });
      } else {
        setQuotaBytes(Number(selected));
        setFeedback({ type: "success", message: "Quota updated." });
      }
    };

    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-base">Storage Quota</h2>
          <progress
            className="progress w-full"
            value={percentUsed}
            max="100"
          ></progress>
          <p>
            {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
          </p>
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label
                className="label label-text text-xs"
                htmlFor="quota-select"
              >
                Quota
              </label>
              <select
                id="quota-select"
                disabled={isAnonymous || loading}
                className="select select-bordered w-full max-w-xs"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {QUOTA_OPTIONS.map((opt) => (
                  <option key={opt.bytes} value={String(opt.bytes)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isAnonymous || loading}
              className="btn btn-primary"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Save"
              )}
            </button>
          </form>
          {feedback && (
            <div
              className={`alert mt-2
              ${feedback.type === "success" ? "alert-success" : "alert-error"}`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    );
  },
);

SetQuotaSection.displayName = "SetQuotaSection";
