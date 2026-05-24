import { formatBytes } from "#/utils/formatBytes";
import type {
  FolderSizeReport,
  R2ReconciliationReport,
} from "#/workers/UserDataDO/types";
import { actions } from "astro:actions";
import { memo, useState, type ReactNode } from "react";

type Report = {
  folderReport: FolderSizeReport;
  r2Report: R2ReconciliationReport;
};

const formatDelta = (bytes: number) => {
  const sign = bytes > 0 ? "+" : bytes < 0 ? "-" : "";
  return `${sign}${formatBytes(Math.abs(bytes))}`;
};

export const StorageReportsSection = memo(({ userId }: { userId: string }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const runReports = async () => {
    setLoading(true);
    setError(null);
    const { data, error: actionError } = await actions.admin.storageReport({
      userId,
    });
    setLoading(false);
    if (actionError || !data || !("folderReport" in data)) {
      setError(actionError?.message ?? "Failed to run reports.");
      return;
    }
    setReport(data);
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-base">Storage Integrity Reports</h2>
        <p className="text-base-content/60 text-xs">
          Read-only checks comparing folder size bookkeeping and R2 blobs
          against the file table. Nothing is modified.
        </p>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={runReports}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Run reports"
            )}
          </button>
        </div>

        {error && <div className="alert alert-error mt-2">{error}</div>}

        {report && (
          <div className="mt-2 flex flex-col gap-6">
            <FolderSizeResult report={report.folderReport} />
            <R2Result report={report.r2Report} />
            <details>
              <summary className="text-base-content/60 cursor-pointer text-xs">
                Raw JSON
              </summary>
              <pre
                className="bg-base-100 mt-2 overflow-x-auto rounded p-2 text-xs"
              >
                {JSON.stringify(report, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
});

StorageReportsSection.displayName = "StorageReportsSection";

const ReportBlock = ({
  title,
  empty,
  emptyLabel,
  children,
}: {
  title: string;
  empty: boolean;
  emptyLabel: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <h4 className="text-sm font-medium">{title}</h4>
    {empty ? (
      <div className="alert alert-success text-sm">{emptyLabel}</div>
    ) : (
      <div className="overflow-x-auto">{children}</div>
    )}
  </div>
);

const FolderSizeResult = memo(({ report }: { report: FolderSizeReport }) => (
  <section className="flex flex-col gap-2">
    <h3 className="font-semibold">Folder size accounting</h3>
    {report.discrepancies.length === 0 ? (
      <div className="alert alert-success text-sm">
        All folder sizes are consistent.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="table-zebra table-sm table">
          <thead>
            <tr>
              <th>Folder</th>
              <th className="text-right">Stored</th>
              <th className="text-right">Expected</th>
              <th className="text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {report.discrepancies.map((d) => (
              <tr key={d.folderId}>
                <td>{d.name}</td>
                <td className="text-right">{formatBytes(d.storedBytes)}</td>
                <td className="text-right">{formatBytes(d.expectedBytes)}</td>
                <td className="text-right">{formatDelta(d.deltaBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
));

FolderSizeResult.displayName = "FolderSizeResult";

const R2Result = memo(({ report }: { report: R2ReconciliationReport }) => (
  <section className="flex flex-col gap-3">
    <h3 className="font-semibold">R2 reconciliation</h3>
    <p className="text-base-content/60 text-xs">
      {report.totals.blobsInR2} blobs in R2 · {report.totals.fileRowsInDb} file
      rows ({report.totals.readyFileRows} ready)
    </p>

    <ReportBlock
      title="Orphan blobs (in R2, not referenced by any file row)"
      empty={report.orphanBlobs.length === 0}
      emptyLabel="No orphaned blobs."
    >
      <table className="table-zebra table-sm table">
        <thead>
          <tr>
            <th>Key</th>
            <th className="text-right">Size</th>
          </tr>
        </thead>
        <tbody>
          {report.orphanBlobs.map((b) => (
            <tr key={b.key}>
              <td className="font-mono text-xs break-all">{b.key}</td>
              <td className="text-right">{formatBytes(b.sizeBytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportBlock>

    <ReportBlock
      title="Missing blobs (referenced by a file row, absent from R2)"
      empty={report.missingBlobs.length === 0}
      emptyLabel="No missing blobs."
    >
      <table className="table-zebra table-sm table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Key</th>
          </tr>
        </thead>
        <tbody>
          {report.missingBlobs.map((m) => (
            <tr key={m.r2Key}>
              <td>{m.name}</td>
              <td>{m.kind}</td>
              <td className="font-mono text-xs break-all">{m.r2Key}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportBlock>

    <ReportBlock
      title="Size mismatches (DB size ≠ R2 size)"
      empty={report.sizeMismatches.length === 0}
      emptyLabel="No size mismatches."
    >
      <table className="table-zebra table-sm table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th className="text-right">DB</th>
            <th className="text-right">R2</th>
          </tr>
        </thead>
        <tbody>
          {report.sizeMismatches.map((m) => (
            <tr key={m.r2Key}>
              <td>{m.name}</td>
              <td>{m.kind}</td>
              <td className="text-right">{formatBytes(m.dbBytes)}</td>
              <td className="text-right">{formatBytes(m.r2Bytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportBlock>
  </section>
));

R2Result.displayName = "R2Result";
