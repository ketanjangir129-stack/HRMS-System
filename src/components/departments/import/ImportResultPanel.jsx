import {
  FiAlertTriangle,
  FiBriefcase,
  FiCheckCircle,
  FiDownload,
  FiGrid,
  FiLayers,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";

import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import {
  IMPORT_STATUS,
  IMPORT_STATUS_LABELS,
} from "../../../utils/departments/departmentImportConstants";
import {
  ERROR_REPORT_HEADER,
  buildFailedReport,
} from "../../../utils/departments/departmentImportValidation";

/*
|--------------------------------------------------------------------------
| What Happened
|--------------------------------------------------------------------------
| The result of a run, on the same screen the run was started from.
|
| The heading is decided by what landed, not by whether the run threw. A run
| where three batches out of four succeeded says "completed with errors" and
| shows the failure count in red, because reporting that as a success is how
| somebody discovers a missing half of their organisation the next time they
| open an employee form and cannot find a designation.
|
| One case is worth reading carefully, because it looks like a failure and is
| not: a run that wrote nothing because everything in the file already existed.
| The importer re-reads the departments immediately before it writes, so a
| department created between the preview and the button - by a colleague, by a
| second tab, or by the same button being pressed twice - is found and left
| alone rather than created again. That is the importer working, and the panel
| says so in those words rather than reporting zero and letting somebody guess.
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

function Stat({ icon, tone, label, value, caption }) {

  const tones = {
    green: "bg-emerald-50 text-emerald-600",
    brand: "bg-brand-ring text-brand",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-surface-raised text-ink-muted",
  };

  return (
    <div className="ui-card flex items-center gap-4 px-5 py-4">

      <div
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${tones[tone] || tones.slate}`}
      >
        {icon}
      </div>

      <div className="min-w-0">

        <p className="ui-eyebrow">{label}</p>

        <p className="text-2xl font-bold text-ink">
          {value.toLocaleString()}
        </p>

        {caption && (
          <p className="truncate text-xs text-ink-subtle" title={caption}>
            {caption}
          </p>
        )}

      </div>

    </div>
  );

}

function ImportResultPanel({
  result,
  rows,
  fileName,
  onImportAnother,
  onViewDepartments,
}) {

  if (!result) return null;

  const heading = HEADINGS[result.status] || HEADINGS[IMPORT_STATUS.FAILED];

  const alreadyExisted = result.alreadyExisted || 0;

  const nothingToDo =
    result.status === IMPORT_STATUS.COMPLETED &&
    result.departmentsCreated === 0 &&
    result.designationsCreated === 0;

  /*
  | The rows a failed batch was carrying, found by the row numbers the service
  | reported. The service works in departments and designations; the file the
  | user re-imports has to be rows, so the translation happens here rather than
  | the service carrying row objects it has no use for.
  */
  const failedRowNumbers = new Set(result.failedRowNumbers || []);

  const failedRows = rows.filter((row) => failedRowNumbers.has(row.rowNumber));

  const downloadFailed = () => {

    downloadCsv(
      `department-import-failed-${result.importId}.csv`,
      ERROR_REPORT_HEADER,
      buildFailedReport(failedRows)
    );

  };

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
            {nothingToDo ? "Nothing left to import" : heading.title}
          </h2>

          <p className="mt-2 max-w-lg text-sm text-ink-subtle">
            {nothingToDo ? (
              "Everything in this file was already in your company, so nothing was created. No department was added twice."
            ) : (
              <>
                {result.departmentsCreated.toLocaleString()}{" "}
                {result.departmentsCreated === 1 ? "department" : "departments"}{" "}
                and {result.designationsCreated.toLocaleString()}{" "}
                {result.designationsCreated === 1
                  ? "designation"
                  : "designations"}{" "}
                were created from {fileName || "your file"}.
                {result.cancelled && " The run was stopped before the end."}
              </>
            )}
          </p>

          <p className="mt-3 font-mono text-xs text-ink-faint">
            {result.importId}
          </p>

        </div>

      </div>

      {/*
        Something the file wanted was already there by the time the write ran.
        Said out loud, because the alternative is a count that is lower than
        the button promised with nothing to explain it.
      */}
      {alreadyExisted > 0 && !nothingToDo && (

        <div className="ui-card flex items-start gap-3 border-blue-200 bg-blue-50/40 px-5 py-4 text-sm sm:px-6">

          <FiCheckCircle className="mt-0.5 shrink-0 text-blue-600" />

          <p className="text-ink">
            <span className="font-semibold">
              {alreadyExisted.toLocaleString()} of them already existed
            </span>{" "}
            when the import ran and were left alone. The departments are checked
            once more immediately before anything is written, so nothing is
            created twice even if it appeared while this page was open.
          </p>

        </div>

      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <Stat
          icon={<FiGrid />}
          tone="green"
          label="Departments"
          value={result.departmentsCreated}
          caption="Now in your organisation"
        />

        <Stat
          icon={<FiBriefcase />}
          tone="brand"
          label="Designations"
          value={result.designationsCreated}
          caption="Now on the employee form"
        />

        <Stat
          icon={<FiCheckCircle />}
          tone="blue"
          label="Left Alone"
          value={result.summary.existing + alreadyExisted}
          caption="Already existed"
        />

        <Stat
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

      </div>

      {/* Recovery */}
      {failedRows.length > 0 && (

        <div className="ui-card flex flex-col gap-3 border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div className="min-w-0">

            <h3 className="text-base font-semibold text-amber-900">
              Finishing this import
            </h3>

            <p className="text-xs text-amber-800">
              Download the rows that did not land and import that file. They are
              checked against your departments again on the way back in, so
              nothing that did land is created twice.
            </p>

          </div>

          <button
            type="button"
            onClick={downloadFailed}
            className="ui-btn ui-btn-secondary shrink-0 font-semibold"
          >
            <FiDownload />
            Download Failed Rows
          </button>

        </div>

      )}

      {/* What to do next */}
      <div className="ui-card flex flex-col gap-3 bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <button
          type="button"
          onClick={onImportAnother}
          className="ui-btn ui-btn-secondary font-semibold"
        >
          <FiRefreshCw />
          Import Another File
        </button>

        <button
          type="button"
          onClick={onViewDepartments}
          className="ui-btn ui-btn-primary font-semibold"
        >
          <FiLayers />
          View Departments
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

export default ImportResultPanel;
