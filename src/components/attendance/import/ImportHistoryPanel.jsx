import { useCallback, useEffect, useState } from "react";
import { FiClock, FiFileText, FiRefreshCw } from "react-icons/fi";

import { getImportHistory } from "../../../services/attendanceServices/attendanceImportService";
import { formatDate, formatDateTime } from "../../../utils/attendance/attendanceDate";
import {
  IMPORT_STATUS_BADGES,
  IMPORT_STATUS_LABELS,
} from "../../../utils/attendance/attendanceImportConstants";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../common/AttendanceState";

/*
|--------------------------------------------------------------------------
| Import History
|--------------------------------------------------------------------------
| Every import this company has run, newest first.
|
| Metadata only, which is all the history node stores: who ran what file, over
| which period, and what happened. The rows themselves are not here and never
| were - they are in the attendance tree, which is the point of importing
| them, and a history that carried a copy would double the size of every
| migration for no reader.
|
| Read once when the panel mounts rather than subscribed. An import is a
| deliberate act somebody is present for, so there is nothing to watch for in
| the background, and the panel refreshes itself when a run finishes.
|--------------------------------------------------------------------------
*/

function ImportHistoryPanel({ companyCode, refreshKey = 0 }) {

  const [runs, setRuns] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  /*
  | The read, and the only place this panel talks to the service.
  |
  | Every state update happens in a promise callback rather than in the body of
  | the effect: the panel starts in its loading state and the Refresh button
  | puts it back into one, so nothing here has to set it synchronously on the
  | way in.
  */
  useEffect(() => {

    let cancelled = false;

    if (!companyCode) {
      return undefined;
    }

    getImportHistory(companyCode)
      .then((data) => {

        if (cancelled) return;

        setRuns(data);
        setError("");

      })
      .catch((loadError) => {

        if (cancelled) return;

        setRuns([]);
        setError(loadError.message || "Could not load the import history.");

      })
      .finally(() => {

        if (!cancelled) setLoading(false);

      });

    return () => {
      cancelled = true;
    };

  }, [companyCode, refreshKey, reloadKey]);

  const reload = useCallback(() => {

    setLoading(true);

    setReloadKey((key) => key + 1);

  }, []);

  return (
    <div className="ui-card overflow-hidden">

      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <div className="flex min-w-0 items-center gap-3">

          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ink-muted"
          >
            <FiClock />
          </div>

          <div className="min-w-0">

            <h2 className="ui-card-title">Import History</h2>

            <p className="ui-card-subtitle">
              The last {runs.length || ""} attendance imports for this company.
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="ui-btn ui-btn-secondary shrink-0"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>

      </div>

      {loading && <TableSkeleton rows={3} />}

      {!loading && error && (
        <ErrorState
          title="Could not load history"
          message={error}
          onRetry={reload}
        />
      )}

      {!loading && !error && runs.length === 0 && (
        <EmptyState
          icon={<FiFileText size={28} />}
          title="No imports yet"
          message="Attendance you import will be listed here with who imported it and what happened."
        />
      )}

      {!loading && !error && runs.length > 0 && (

        <div className="ui-scroll overflow-x-auto">

          <table className="w-full min-w-[54rem] border-collapse text-left text-sm">

            <thead>
              <tr className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">
                <th scope="col" className="px-4 py-3 font-semibold lg:px-6">File</th>
                <th scope="col" className="px-4 py-3 font-semibold">Imported By</th>
                <th scope="col" className="px-4 py-3 font-semibold">Period</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">Rows</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">Imported</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">Skipped</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">Failed</th>
                <th scope="col" className="px-4 py-3 font-semibold lg:pr-6">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line-subtle">

              {runs.map((run) => (

                <tr key={run.importId} className="transition-colors hover:bg-surface-muted">

                  <td className="px-4 py-4 lg:px-6">

                    <p className="max-w-56 truncate font-semibold text-ink" title={run.fileName}>
                      {run.fileName || "Untitled file"}
                    </p>

                    <p className="text-xs text-ink-faint">
                      {formatDateTime(run.uploadedAt)}
                    </p>

                  </td>

                  <td className="px-4 py-4 font-mono text-xs text-ink-muted">
                    {run.uploadedBy || "--"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-ink-muted">
                    {run.fromDate
                      ? `${formatDate(run.fromDate)} – ${formatDate(run.toDate)}`
                      : "--"}
                  </td>

                  <td className="px-4 py-4 text-center text-ink-muted">
                    {(run.totalRows || 0).toLocaleString()}
                  </td>

                  <td className="px-4 py-4 text-center font-semibold text-emerald-600">
                    {(run.importedRows || 0).toLocaleString()}
                  </td>

                  <td className="px-4 py-4 text-center text-ink-subtle">
                    {(run.skippedRows || 0).toLocaleString()}
                  </td>

                  <td
                    className={`px-4 py-4 text-center font-semibold ${
                      run.failedRows ? "text-red-600" : "text-ink-faint"
                    }`}
                  >
                    {(run.failedRows || 0).toLocaleString()}
                  </td>

                  <td className="px-4 py-4 lg:pr-6">
                    <span
                      className={`ui-badge ring-1 ${
                        IMPORT_STATUS_BADGES[run.status] ||
                        "bg-surface-raised text-ink-muted ring-line"
                      }`}
                    >
                      {IMPORT_STATUS_LABELS[run.status] || run.status}
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );

}

export default ImportHistoryPanel;
