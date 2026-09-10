import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiLock,
  FiXCircle,
} from "react-icons/fi";

import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import { formatDate } from "../../../utils/attendance/attendanceDate";
import {
  IMPORT_MODE,
  IMPORT_MODE_OPTIONS,
} from "../../../utils/attendance/attendanceImportConstants";
import {
  ERROR_REPORT_HEADER,
  buildErrorReport,
} from "../../../utils/attendance/attendanceImportValidation";
import { ImportStatCard, ImportStatGrid } from "./ImportStatCards";

/*
|--------------------------------------------------------------------------
| Step Four - Validate
|--------------------------------------------------------------------------
| What the file will actually do, before it does any of it.
|
| Three things are decided on this screen and nothing is written by any of
| them: what is wrong and with how many rows, what happens to the days that
| already have attendance, and whether the errors are worth going back to fix
| before importing the rest.
|
| The error report is offered here rather than only at the end, because the
| useful moment to hand somebody a list of broken rows is while they can still
| fix them and re-import - not after the import they could have corrected.
|
| The import mode sits here too. It changes what a day that already has
| attendance means, so it belongs with the count of those days rather than
| behind the confirmation dialog where it would be a decision made in passing.
|--------------------------------------------------------------------------*/

function IssueRow({ icon, tone, label, count, description }) {

  if (!count) return null;

  const tones = {
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 sm:px-6">

      <div
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="font-semibold text-ink">
          {count.toLocaleString()} {label}
        </p>

        <p className="mt-0.5 text-sm text-ink-subtle">
          {description}
        </p>

      </div>

    </div>
  );

}

function ImportValidateStep({
  rows,
  summary,
  mode,
  onModeChange,
  fileName,
  onBack,
  onContinue,
}) {

  const downloadErrors = () => {

    downloadCsv(
      `attendance-import-errors-${Date.now()}.csv`,
      ERROR_REPORT_HEADER,
      buildErrorReport(rows, mode)
    );

  };

  const blockedRows =
    summary.errors + summary.duplicates + summary.conflicts;

  const hasReport = buildErrorReport(rows, mode).length > 0;

  return (
    <div className="space-y-6">

      <ImportStatGrid>

        <ImportStatCard
          icon={<FiCheckCircle />}
          tone="green"
          label="Will Import"
          value={summary.newRecords}
          caption={
            mode === IMPORT_MODE.REPLACE && summary.replaced
              ? `${summary.replaced} of them replace an existing day`
              : "New attendance records"
          }
        />

        <ImportStatCard
          icon={<FiCopy />}
          tone="blue"
          label="Already Recorded"
          value={summary.existing}
          caption={
            mode === IMPORT_MODE.SKIP
              ? "Skipped - left as they are"
              : "Will be replaced"
          }
        />

        <ImportStatCard
          icon={<FiAlertTriangle />}
          tone={summary.warnings ? "amber" : "slate"}
          label="Warnings"
          value={summary.warnings}
          caption="Imported, but worth a look"
        />

        <ImportStatCard
          icon={<FiXCircle />}
          tone={summary.errors ? "red" : "slate"}
          label="Errors"
          value={summary.errors}
          caption="Will not be imported"
        />

      </ImportStatGrid>

      {/* What the file covers */}
      <div className="ui-card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <div className="flex min-w-0 items-center gap-3">

          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-ring text-brand"
          >
            <FiCalendar />
          </div>

          <div className="min-w-0">

            <p className="font-semibold text-ink">
              {summary.firstDate
                ? `${formatDate(summary.firstDate)} to ${formatDate(summary.lastDate)}`
                : "No readable dates"}
            </p>

            <p className="text-xs text-ink-subtle">
              {summary.dates.toLocaleString()} days across{" "}
              {summary.employees.toLocaleString()} employees, from{" "}
              {fileName || "your file"}
            </p>

          </div>

        </div>

        {hasReport && (
          <button
            type="button"
            onClick={downloadErrors}
            className="ui-btn ui-btn-secondary shrink-0 font-semibold"
          >
            <FiDownload />
            Download Error Report
          </button>
        )}

      </div>

      {/* What is wrong, by kind */}
      {blockedRows > 0 && (

        <div className="ui-card overflow-hidden">

          <div className="border-b border-line px-5 py-4 sm:px-6">

            <h2 className="ui-card-title">
              {blockedRows.toLocaleString()} rows will not be imported
            </h2>

            <p className="ui-card-subtitle">
              Everything else still imports. Fix these in your file and import
              it again to add them.
            </p>

          </div>

          <div className="divide-y divide-line-subtle">

            <IssueRow
              icon={<FiXCircle size={16} />}
              tone="red"
              count={summary.unmatched}
              label="rows have no matching employee"
              description="The employee ID does not exist in this company. Employees are never created by an import."
            />

            <IssueRow
              icon={<FiCopy size={16} />}
              tone="amber"
              count={summary.duplicates}
              label="rows are duplicates within this file"
              description="The same employee and day appear more than once. The first is imported and the rest are skipped."
            />

            <IssueRow
              icon={<FiLock size={16} />}
              tone="red"
              count={summary.conflicts}
              label="rows clash with approved leave"
              description="These days are already recorded against an approved leave request. An import never overwrites those - releasing the leave is what gives the day back."
            />

            <IssueRow
              icon={<FiCalendar size={16} />}
              tone="red"
              count={summary.ambiguousDates}
              label="rows have a date that could not be read"
              description="Go back to the mapping step and choose an explicit date format."
            />

          </div>

        </div>

      )}

      {/* Existing attendance */}
      <fieldset className="ui-card overflow-hidden">

        <legend className="sr-only">What to do about days that already have attendance</legend>

        <div className="border-b border-line px-5 py-4 sm:px-6">

          <h2 className="ui-card-title">
            Days That Already Have Attendance
          </h2>

          <p className="ui-card-subtitle">
            {summary.existing > 0
              ? `${summary.existing.toLocaleString()} of the days in this file already have a record.`
              : "None of the days in this file already have a record."}
          </p>

        </div>

        <div className="divide-y divide-line-subtle">

          {IMPORT_MODE_OPTIONS.map((option) => {

            const selected = mode === option.value;

            const destructive = option.value === IMPORT_MODE.REPLACE;

            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors sm:px-6 ${
                  selected ? "bg-brand-ring/30" : "hover:bg-surface-muted"
                }`}
              >

                <input
                  type="radio"
                  name="import-mode"
                  value={option.value}
                  checked={selected}
                  onChange={() => onModeChange(option.value)}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-brand)]"
                />

                <span className="min-w-0">

                  <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">

                    {option.label}

                    {destructive && (
                      <span className="ui-badge bg-red-50 text-red-600">
                        Destructive
                      </span>
                    )}

                  </span>

                  <span className="mt-0.5 block text-sm text-ink-subtle">
                    {option.description}
                  </span>

                </span>

              </label>
            );

          })}

        </div>

        {mode === IMPORT_MODE.REPLACE && summary.existing > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 border-t border-line bg-red-50 px-5 py-4 text-sm text-red-700 sm:px-6"
          >
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold">
                {summary.existing.toLocaleString()} existing attendance{" "}
                {summary.existing === 1 ? "record" : "records"} will be
                overwritten.
              </span>{" "}
              This cannot be undone. Days linked to approved leave are still
              protected and are listed as conflicts above.
            </p>
          </div>
        )}

      </fieldset>

      {/* Actions */}
      <div className="ui-card flex flex-col gap-3 bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <button type="button" onClick={onBack} className="ui-btn ui-btn-secondary">
          <FiArrowLeft />
          Back
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={summary.newRecords === 0}
          className="ui-btn ui-btn-primary font-semibold"
        >
          Preview {summary.newRecords.toLocaleString()} Records
        </button>

      </div>

    </div>
  );

}

export default ImportValidateStep;
