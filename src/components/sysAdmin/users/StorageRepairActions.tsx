import type {
  FolderSizeReport,
  R2ReconciliationReport,
} from "#/workers/UserDataDO/types";
import { actions } from "astro:actions";
import { DatabaseZap, RefreshCw, Trash2 } from "lucide-react";
import { memo, useRef, useState } from "react";

type StorageReport = {
  folderReport: FolderSizeReport;
  r2Report: R2ReconciliationReport;
};

type StorageRepairActionsProps = {
  userId: string;
  report: StorageReport;
  reportLoading: boolean;
  onRepairComplete: () => Promise<void>;
};

type RepairOperation = "folders" | "orphans" | "missing";

type Feedback = {
  kind: "success" | "error";
  message: string;
};

const getActionError = (message?: string) => message ?? "Repair failed.";

export const StorageRepairActions = memo(
  ({
    userId,
    report,
    reportLoading,
    onRepairComplete,
  }: StorageRepairActionsProps) => {
    const [pendingOperation, setPendingOperation] =
      useState<RepairOperation | null>(null);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const hasFolderDiscrepancies = report.folderReport.discrepancies.length > 0;
    const hasOrphanBlobs = report.r2Report.orphanBlobs.length > 0;
    const hasMissingBlobs = report.r2Report.missingBlobs.length > 0;
    const isWorking = reportLoading || pendingOperation !== null;

    const runRecalculateFolders = async () => {
      setPendingOperation("folders");
      setFeedback(null);

      const { data, error } = await actions.admin.recalculateStorageFolderSizes(
        { userId },
      );

      if (error || !data) {
        setFeedback({ kind: "error", message: getActionError(error?.message) });
        setPendingOperation(null);
        return;
      }

      setFeedback({
        kind: "success",
        message: `recalculated ${data.recalculatedFolders} folders`,
      });
      await onRepairComplete();
      setPendingOperation(null);
    };

    const runDeleteOrphans = async () => {
      setPendingOperation("orphans");
      setFeedback(null);

      const { data, error } = await actions.admin.deleteStorageOrphans({
        userId,
        orphanBlobs: report.r2Report.orphanBlobs,
      });

      if (error || !data) {
        setFeedback({ kind: "error", message: getActionError(error?.message) });
        setPendingOperation(null);
        return;
      }

      const deferredMessage =
        data.deferred > 0 ? `, deferred ${data.deferred}` : "";
      setFeedback({
        kind: "success",
        message: `deleted ${data.deleted} orphaned objects, skipped ${data.skipped.length}, failed ${data.failed.length}${deferredMessage}`,
      });
      await onRepairComplete();
      setPendingOperation(null);
    };

    const runCleanupMissing = async () => {
      setPendingOperation("missing");
      setFeedback(null);

      const missingBlobs = report.r2Report.missingBlobs.map(
        ({ nodeId, r2Key, kind }) => ({
          nodeId,
          r2Key,
          kind,
        }),
      );
      const { data, error } = await actions.admin.cleanupMissingStorageObjects({
        userId,
        missingBlobs,
      });

      if (error || !data) {
        setFeedback({ kind: "error", message: getActionError(error?.message) });
        setPendingOperation(null);
        return;
      }

      const deferredMessage =
        data.deferred > 0 ? `, deferred ${data.deferred}` : "";
      setFeedback({
        kind: "success",
        message: `deleted ${data.deletedFileRecords} file records, cleared ${data.clearedThumbnailReferences} thumbnail references, skipped ${data.skipped.length}, thumbnail delete failures ${data.thumbnailObjectDeleteFailures.length}${deferredMessage}`,
      });
      await onRepairComplete();
      setPendingOperation(null);
    };

    if (
      !feedback &&
      !hasFolderDiscrepancies &&
      !hasOrphanBlobs &&
      !hasMissingBlobs
    ) {
      return null;
    }

    return (
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {hasFolderDiscrepancies && (
            <button
              type="button"
              className="btn btn-secondary btn-sm gap-2"
              disabled={isWorking}
              onClick={runRecalculateFolders}
            >
              {pendingOperation === "folders" ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <RefreshCw size={16} />
              )}
              Recalculate folder sizes
            </button>
          )}

          {hasOrphanBlobs && (
            <ConfirmedRepairButton
              buttonLabel="Delete orphaned objects"
              confirmLabel="Delete objects"
              confirmTitle="Delete orphaned R2 objects?"
              confirmBody={`This will delete ${report.r2Report.orphanBlobs.length} orphaned R2 objects for this user. This cannot be undone.`}
              disabled={isWorking}
              icon="trash"
              pending={pendingOperation === "orphans"}
              onConfirm={runDeleteOrphans}
            />
          )}

          {hasMissingBlobs && (
            <ConfirmedRepairButton
              buttonLabel="Clean missing references"
              confirmLabel="Clean references"
              confirmTitle="Clean missing storage references?"
              confirmBody={`This will delete or clear ${report.r2Report.missingBlobs.length} missing storage references for this user. This cannot be undone.`}
              disabled={isWorking}
              icon="database"
              pending={pendingOperation === "missing"}
              onConfirm={runCleanupMissing}
            />
          )}
        </div>

        {feedback && (
          <div
            role="alert"
            className={`alert text-sm ${
              feedback.kind === "success" ? "alert-success" : "alert-error"
            }`}
          >
            {feedback.message}
          </div>
        )}
      </section>
    );
  },
);

StorageRepairActions.displayName = "StorageRepairActions";

type ConfirmedRepairButtonProps = {
  buttonLabel: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel: string;
  disabled: boolean;
  icon: "database" | "trash";
  pending: boolean;
  onConfirm: () => Promise<void>;
};

const ConfirmedRepairButton = ({
  buttonLabel,
  confirmTitle,
  confirmBody,
  confirmLabel,
  disabled,
  icon,
  pending,
  onConfirm,
}: ConfirmedRepairButtonProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-error btn-sm gap-2"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
      >
        {pending ? (
          <span className="loading loading-spinner loading-xs" />
        ) : icon === "trash" ? (
          <Trash2 size={16} />
        ) : (
          <DatabaseZap size={16} />
        )}
        {buttonLabel}
      </button>

      <dialog ref={dialogRef} closedby="any" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{confirmTitle}</h3>
          <p className="text-base-content/70 py-2 text-sm">{confirmBody}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
            <button
              type="button"
              className="btn btn-error"
              disabled={disabled}
              onClick={() => {
                dialogRef.current?.close();
                void onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
};
