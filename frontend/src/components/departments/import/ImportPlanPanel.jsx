import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCheck,
  FiCheckCircle,
  FiColumns,
  FiDownload,
  FiFile,
  FiGrid,
  FiLoader,
  FiPlus,
  FiSlash,
  FiTrash2,
  FiUploadCloud,
  FiXCircle,
} from "react-icons/fi";

import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import { IMPORT_FIELDS } from "../../../utils/departments/departmentImportConstants";
import {
  ERROR_REPORT_HEADER,
  buildErrorReport,
} from "../../../utils/departments/departmentImportValidation";
import { formatFileSize } from "../../../utils/departments/departmentImportParse";

/*
|--------------------------------------------------------------------------
| What This File Will Do
|--------------------------------------------------------------------------
| The whole importer after the file has been picked: what was read, what will
| be added, what was matched to something that already exists, what could not
| be read, and the button.
|
| One panel rather than four screens. Everything on it was worked out the
| moment the file was chosen, so there is nothing here that is waiting to be
| answered - it is a statement, not a form, and the only decision on it is
| whether to press the button.
|
| The departments that already exist are shown by name rather than as a count,
| and that is the most important thing on the panel. "Human Resources - already
| exists, adding 2 designations" is the sentence somebody needs to read before
| they will believe an importer is not about to create a second Human
| Resources, and a number cannot say it.
|
| The column pickers are folded away when the detection found what it needed
| and open on their own when it did not, so the common case is a panel with no
| controls on it at all.
|--------------------------------------------------------------------------
*/

function Count({ icon, tone, value, label }) {

  const tones = {
    green: "bg-emerald-50 text-emerald-600",
    brand: "bg-brand-ring text-brand",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-surface-raised text-ink-muted",
  };

  return (
    <div className="flex items-center gap-3">

      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.slate}`}
      >
        {icon}
      </span>

      <div className="min-w-0">

        <p className="text-lg font-bold leading-tight text-ink">
          {value.toLocaleString()}
        </p>

        <p className="truncate text-xs text-ink-subtle">
          {label}
        </p>

      </div>

    </div>
  );

}

/*
| One department in the plan: whether it is being created or added to, and the
| designations it gains.
*/
function PlanCard({ entry }) {

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        entry.isNew
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-line bg-surface-muted"
      }`}
    >

      <div className="flex flex-wrap items-center gap-2">

        <span
          aria-hidden="true"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            entry.isNew
              ? "bg-emerald-100 text-emerald-700"
              : "bg-surface-raised text-ink-muted"
          }`}
        >
          {entry.isNew ? <FiPlus size={14} /> : <FiCheck size={14} />}
        </span>

        <span className="min-w-0 font-semibold text-ink">
          {entry.name}
        </span>

        <span
          className={`ui-badge ${
            entry.isNew
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {entry.isNew ? "New department" : "Already exists"}
        </span>

      </div>

      {entry.designations.length > 0 ? (

        <>

          <p className="mt-2.5 text-xs font-medium text-ink-subtle">
            {entry.isNew
              ? `With ${entry.designations.length} ${entry.designations.length === 1 ? "designation" : "designations"}`
              : `Adding ${entry.designations.length} ${entry.designations.length === 1 ? "designation it does not have" : "designations it does not have"}`}
          </p>

          <ul className="mt-2 flex flex-wrap gap-1.5">

            {entry.designations.map((designation) => (

              <li
                key={designation.key}
                className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted ring-1 ring-line"
              >
                <FiPlus className="shrink-0 text-emerald-600" size={11} />
                {designation.name}
              </li>

            ))}

          </ul>

        </>

      ) : (

        <p className="mt-2 text-xs text-ink-subtle">
          No designations. You can add them on the Departments screen later.
        </p>

      )}

    </div>
  );

}

function ImportPlanPanel({
  file,
  rowCount,
  headers,
  mapping,
  onMapColumn,
  departmentMapped,
  rows,
  plan,
  summary,
  importing,
  progress,
  error,
  onClear,
  onImport,
  onCancel,
}) {

  /*
  | The pickers open themselves when the department column was not found,
  | because at that point nothing else on the panel means anything.
  */
  const [showColumns, setShowColumns] = useState(!departmentMapped);

  const report = useMemo(() => buildErrorReport(rows), [rows]);

  /*
  | The departments in the file that the company already has, by their stored
  | name, however the file spelled them. Read off the rows rather than the plan
  | because a matched department with nothing to add is not in the plan at all -
  | and it is exactly the one somebody is afraid got duplicated.
  */
  const matched = useMemo(() => {

    const names = new Map();

    rows.forEach((row) => {

      if (!row.departmentExists || row.errors.length > 0) return;

      names.set(row.departmentKey, row.existingDepartmentName);

    });

    return [...names.values()];

  }, [rows]);

  const blocked = summary.errors + summary.duplicates;

  const downloadErrors = () => {

    downloadCsv(
      `department-import-errors-${Date.now()}.csv`,
      ERROR_REPORT_HEADER,
      report
    );

  };

  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.processed / progress.total) * 100);

  return (
    <div className="space-y-6">

      {/* The file, and what was read out of it */}
      <div className="ui-card overflow-hidden">

        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div className="flex min-w-0 items-center gap-3">

            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-ring text-brand"
            >
              <FiFile size={20} />
            </div>

            <div className="min-w-0">

              <p className="truncate font-semibold text-ink" title={file?.name}>
                {file?.name}
              </p>

              <p className="text-xs text-ink-subtle">
                {formatFileSize(file?.size)} · {rowCount.toLocaleString()}{" "}
                {rowCount === 1 ? "row" : "rows"}
              </p>

            </div>

          </div>

          <div className="flex shrink-0 flex-wrap gap-2">

            <button
              type="button"
              onClick={() => setShowColumns((open) => !open)}
              aria-expanded={showColumns}
              className="ui-btn ui-btn-secondary"
            >
              <FiColumns />
              Columns
            </button>

            <button
              type="button"
              onClick={onClear}
              disabled={importing}
              className="ui-btn ui-btn-secondary"
            >
              <FiTrash2 />
              Remove
            </button>

          </div>

        </div>

        {/*
          The columns. Hidden when the detection was sure, because confirming a
          guess that was right is the step this importer does not have.
        */}
        {showColumns && (

          <div className="divide-y divide-line-subtle border-b border-line bg-surface-muted/50">

            {IMPORT_FIELDS.map((field) => {

              const value = mapping[field.key];

              const isMapped = value !== undefined && value !== null;

              return (
                <div
                  key={field.key}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                >

                  <label
                    htmlFor={`import-column-${field.key}`}
                    className="min-w-0 text-sm font-semibold text-ink sm:w-40"
                  >

                    {field.label}

                    {field.required && (
                      <span className="ml-2 text-red-600" aria-hidden="true">*</span>
                    )}

                  </label>

                  <select
                    id={`import-column-${field.key}`}
                    value={isMapped ? value : ""}
                    onChange={(event) =>
                      onMapColumn(field.key, event.target.value)
                    }
                    disabled={importing}
                    aria-invalid={field.required && !isMapped ? "true" : undefined}
                    className={`ui-field min-w-0 flex-1 cursor-pointer ${
                      field.required && !isMapped ? "border-red-300" : ""
                    }`}
                  >

                    <option value="">
                      {field.required
                        ? "Choose a column..."
                        : "Not in this file"}
                    </option>

                    {headers.map((header) => (
                      <option key={header.index} value={header.index}>
                        {header.label}
                      </option>
                    ))}

                  </select>

                </div>
              );

            })}

          </div>

        )}

        {/* The counts */}
        <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4 sm:px-6">

          <Count
            icon={<FiGrid size={16} />}
            tone="green"
            value={summary.newDepartments}
            label="New departments"
          />

          <Count
            icon={<FiBriefcase size={16} />}
            tone="brand"
            value={summary.newDesignations}
            label="New designations"
          />

          <Count
            icon={<FiCheckCircle size={16} />}
            tone={matched.length ? "blue" : "slate"}
            value={matched.length}
            label="Matched, not created"
          />

          <Count
            icon={<FiXCircle size={16} />}
            tone={blocked ? "red" : "slate"}
            value={blocked}
            label="Rows skipped"
          />

        </div>

      </div>

      {/* Departments the file names that you already have */}
      {matched.length > 0 && (

        <div className="ui-card flex flex-col gap-3 border-blue-200 bg-blue-50/40 px-5 py-4 sm:px-6">

          <div className="flex items-start gap-3">

            <FiCheckCircle className="mt-0.5 shrink-0 text-blue-600" />

            <p className="text-sm text-ink">
              <span className="font-semibold">
                {matched.length}{" "}
                {matched.length === 1 ? "department is" : "departments are"}{" "}
                already in your company
              </span>{" "}
              and will not be created again. They keep their name, their manager
              and every designation they already have.
            </p>

          </div>

          <ul className="flex flex-wrap gap-1.5 pl-7">

            {matched.map((name) => (
              <li
                key={name}
                className="rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted ring-1 ring-line"
              >
                {name}
              </li>
            ))}

          </ul>

        </div>

      )}

      {/* What will be written */}
      <div className="ui-card overflow-hidden">

        <div className="border-b border-line px-5 py-4 sm:px-6">

          <h2 className="ui-card-title">What Will Be Added</h2>

          <p className="ui-card-subtitle">
            {summary.writes === 0
              ? "Nothing - your company already has everything in this file."
              : "Nothing has been written yet."}
          </p>

        </div>

        {plan.length > 0 && (

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-3">

            {plan.map((entry) => (
              <PlanCard key={entry.key} entry={entry} />
            ))}

          </div>

        )}

        {plan.length === 0 && (

          <div className="px-5 py-10 text-center text-sm text-ink-subtle sm:px-6">
            {departmentMapped
              ? "This file adds nothing your company does not already have."
              : "Choose which column holds the department name to see what this file would add."}
          </div>

        )}

      </div>

      {/* What could not be read */}
      {blocked > 0 && (

        <div className="ui-card overflow-hidden border-amber-200">

          <div className="flex flex-col gap-3 border-b border-line bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div className="min-w-0">

              <h3 className="text-base font-semibold text-amber-900">
                {blocked.toLocaleString()}{" "}
                {blocked === 1 ? "row is" : "rows are"} being skipped
              </h3>

              <p className="text-xs text-amber-800">
                Everything else still imports. Fix these and import the file
                again to add them.
              </p>

            </div>

            {report.length > 0 && (
              <button
                type="button"
                onClick={downloadErrors}
                className="ui-btn ui-btn-secondary shrink-0 font-semibold"
              >
                <FiDownload />
                Download
              </button>
            )}

          </div>

          <ul className="divide-y divide-line-subtle">

            {summary.errors > 0 && (
              <li className="px-5 py-3 text-sm sm:px-6">

                <span className="font-semibold text-ink">
                  {summary.errors.toLocaleString()} with a name that cannot be
                  used.
                </span>{" "}
                <span className="text-ink-subtle">
                  A department or designation must be 2 to 50 letters - the same
                  rule the Add Department form applies.
                </span>

              </li>
            )}

            {summary.duplicates > 0 && (
              <li className="px-5 py-3 text-sm sm:px-6">

                <span className="font-semibold text-ink">
                  {summary.duplicates.toLocaleString()} repeated earlier in the
                  file.
                </span>{" "}
                <span className="text-ink-subtle">
                  The first one is imported and the rest are skipped, so nothing
                  is created twice.
                </span>

              </li>
            )}

          </ul>

        </div>

      )}

      {error && (
        <div
          role="alert"
          className="ui-card flex items-start gap-3 border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:px-6"
        >
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* The button, or the bar that replaces it */}
      <div className="ui-card bg-surface-muted px-5 py-4 sm:px-6">

        {importing ? (

          <div className="space-y-3">

            <div className="flex items-center justify-between gap-4">

              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <FiLoader className="animate-spin text-brand" />
                Importing... batch{" "}
                {Math.min(
                  progress.batches.succeeded + progress.batches.failed + 1,
                  progress.batches.total || 1
                )}{" "}
                of {progress.batches.total || 1}
              </p>

              <span className="text-sm font-semibold text-brand">
                {percent}%
              </span>

            </div>

            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Import progress"
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-raised"
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-3"
            >

              <p className="text-xs text-ink-subtle">
                {progress.departmentsCreated.toLocaleString()} departments and{" "}
                {progress.designationsCreated.toLocaleString()} designations
                written
                {progress.failed > 0 && (
                  <span className="font-semibold text-red-600">
                    {" "}· {progress.failed.toLocaleString()} failed
                  </span>
                )}
                . Leave this page open until it finishes.
              </p>

              <button
                type="button"
                onClick={onCancel}
                className="ui-btn ui-btn-ghost font-semibold"
              >
                <FiSlash />
                Stop after this batch
              </button>

            </div>

          </div>

        ) : (

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-ink-subtle">
              Nothing you already have is renamed, removed or created again.
            </p>

            <button
              type="button"
              onClick={onImport}
              disabled={summary.writes === 0}
              className="ui-btn ui-btn-primary font-semibold"
            >
              <FiUploadCloud />
              {summary.writes === 0
                ? "Nothing To Import"
                : `Add ${summary.newDepartments.toLocaleString()} ${
                    summary.newDepartments === 1 ? "Department" : "Departments"
                  } and ${summary.newDesignations.toLocaleString()} ${
                    summary.newDesignations === 1
                      ? "Designation"
                      : "Designations"
                  }`}
            </button>

          </div>

        )}

      </div>

    </div>
  );

}

export default ImportPlanPanel;
