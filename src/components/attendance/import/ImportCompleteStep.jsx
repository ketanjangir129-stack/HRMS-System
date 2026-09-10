import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";

import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import {
  IMPORT_STATUS,
  IMPORT_STATUS_LABELS,
} from "../../../utils/attendance/attendanceImportConstants";
import {
  ERROR_REPORT_HEADER,
  buildErrorReport,
  buildFailedReport,
} from "../../../utils/attendance/attendanceImportValidation";
import { ImportStatCard, ImportStatGrid } from "./ImportStatCards";

/*
|--------------------------------------------------------------------------
| Step Seven - Complete
|--------------------------------------------------------------------------
| What actually happened.
|
| The heading is decided by what landed, not by whether the run threw. A run
| where three batches out of four succeeded says "completed with errors" and
| shows the failure count in red, because reporting that as a success is how
| somebody discovers a missing fortnight during a payroll run months later.
|
| Two downloads are offered and they are different files:
|
|   Failed rows   the days the database refused, so the run can be finished
|                 by importing exactly those rather than the whole file again
|   Error report  the rows that never got as far as being written, which is a
|                 file to correct rather than to retry
|
| Retrying is deliberately not automatic. A failed batch re-run without being
| looked at is a failed batch run twice, and the rows have to go back through
| validation anyway - the days they cover may have been written by somebody
| else in the meantime.
|--------------------------------------------------------------------------
*/

const HEADINGS = {
  [IMPORT_STATUS.COMPLETED]: {
    title: "Import complete",
    tone: "bg-emerald-50 text-emerald-600",
    icon: <FiCheckCircle size={30} />,
  },
  [IMPORT_STATUS.COMPLETED_WITH_ERRORS]: {
    title: "Import completed with errors",
    tone: "bg-amber-50 text-amber-600",
    icon: <FiAlertTriangle size={30} />,
  },
  [IMPORT_STATUS.FAILED]: {
    title: "Import failed",
    tone: "bg-red-50 text-red-600",
    icon: <FiXCircle size={30} />,
  },
};

function ImportCompleteStep({
  result,
  rows,
  mode,
  fileName,
  onImportAnother,
  onViewAttendance,
}) {

  if (!result) return null;

  const heading = HEADINGS[result.status] || HEADINGS[IMPORT_STATUS.FAILED];

  const { summary } = result;

  const remaining = Math.max(result.total - result.processed, 0);

  const downloadFailed = () => {

    downloadCsv(
      `attendance-import-failed-${result.importId}.csv`,
      ERROR_REPORT_HEADER,
      buildFailedReport(result.failedRows, mode)
    );

  };

  const downloadErrors = () => {

    downloadCsv(
      `attendance-import-errors-${result.importId}.csv`,
      ERROR_REPORT_HEADER,
      buildErrorReport(rows, mode)
    );

  };

  const hasErrorReport = buildErrorReport(rows, mode).length > 0;

  return (
    <div className="space-y-6">

      {/* The verdict */}
      <div className="ui-card overflow-hidden">

        <div className="flex flex-col items-center px-5 py-10 text-center sm:px-6">

          <div
            aria-hidden="true"
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${heading.tone}`}
          >
            {heading.icon}
          </div>

          <h2 className="mt-5 text-xl font-bold text-ink sm:text-2xl">
            {heading.title}
          </h2>

          <p className="mt-2 max-w-lg text-sm text-ink-subtle">
            {result.imported.toLocaleString()}{" "}
            {result.imported === 1 ? "record was" : "records were"} written into
            attendance from {fileName || "your file"}.
            {result.cancelled && " The run was stopped before the end."}
            {remaining > 0 &&
              ` ${remaining.toLocaleString()} rows were never attempted.`}
          </p>

          <p className="mt-3 font-mono text-xs text-ink-faint">
            {result.importId}
          </p>

        </div>

      </div>

      <ImportStatGrid>

        <ImportStatCard
          icon={<FiCheckCircle />}
          tone="green"
          label="Imported"
          value={result.imported}
          caption="Now visible in attendance"
        />

        <ImportStatCard
          icon={<FiCopy />}
          tone="blue"
          label="Skipped"
          value={summary.existing}
          caption="Already had attendance"
        />

        <ImportStatCard
          icon={<FiXCircle />}
          tone={result.failed ? "red" : "slate"}
          label="Failed"
          value={result.failed}
          caption={
            result.failed
              ? `${result.batches.failed} of ${result.batches.total} batches`
              : "Every batch was written"
          }
        />

        <ImportStatCard
          icon={<FiAlertTriangle />}
          tone={summary.errors ? "amber" : "slate"}
          label="Not Imported"
          value={summary.errors}
          caption="Invalid rows from the file"
        />

      </ImportStatGrid>

      {/* Recovery */}
      {(result.failed > 0 || remaining > 0) && (

        <div className="ui-card overflow-hidden border-amber-200">

          <div className="flex flex-col gap-3 border-b border-line bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div className="min-w-0">

              <h3 className="text-base font-semibold text-amber-900">
                Finishing this import
              </h3>

              <p className="text-xs text-amber-800">
                Download the rows that did not land, check them, and import that
                file. They will be validated again on the way back in.
              </p>

            </div>

            {result.failedRows.length > 0 && (
              <button
                type="button"
                onClick={downloadFailed}
                className="ui-btn ui-btn-secondary shrink-0 font-semibold"
              >
                <FiDownload />
                Download Failed Rows
              </button>
            )}

          </div>

        </div>

      )}

      {/* What to do next */}
      <div className="ui-card flex flex-col gap-3 bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <div className="flex flex-col gap-3 sm:flex-row">

          <button
            type="button"
            onClick={onImportAnother}
            className="ui-btn ui-btn-secondary font-semibold"
          >
            <FiRefreshCw />
            Import Another File
          </button>

          {hasErrorReport && (
            <button
              type="button"
              onClick={downloadErrors}
              className="ui-btn ui-btn-secondary font-semibold"
            >
              <FiDownload />
              Download Error Report
            </button>
          )}

        </div>

        <button
          type="button"
          onClick={onViewAttendance}
          className="ui-btn ui-btn-primary font-semibold"
        >
          <FiCalendar />
          View Monthly Attendance
        </button>

      </div>

      <p className="px-1 text-center text-xs text-ink-faint">
        This run is recorded as{" "}
        {IMPORT_STATUS_LABELS[result.status] || result.status} in the import
        history below.
      </p>

    </div>
  );

}

export default ImportCompleteStep;
