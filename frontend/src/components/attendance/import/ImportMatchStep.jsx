import { useMemo } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiDownload,
  FiLoader,
  FiRefreshCw,
  FiUserCheck,
  FiUserPlus,
  FiUserX,
  FiUsers,
} from "react-icons/fi";

import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import { ImportStatCard, ImportStatGrid } from "./ImportStatCards";

/*
|--------------------------------------------------------------------------
| Step Three - Match Employees
|--------------------------------------------------------------------------
| Which rows belong to somebody who actually exists.
|
| Shown on its own, before anything is read out of the attendance tree,
| because an id that names nobody is the failure that wastes the most of
| somebody's time: it is usually a whole file exported with the payroll
| system's own numbering rather than the HRMS ids, and finding that out after
| a minute of month reads - or worse, after importing the third of the file
| that happened to match - helps nobody.
|
| The unmatched ids are listed by id rather than by row, with a count each.
| Twelve hundred rows for one missing employee is one problem, and a list
| twelve hundred lines long is a list nobody reads.
|
| No employee is ever created here. An import that invented the people it could
| not find would fill the directory with whatever the old system happened to
| have in it, and every one of them would then need cleaning up by hand.
|--------------------------------------------------------------------------
*/

function ImportMatchStep({
  rows,
  summary,
  busy,
  error,
  scope,
  rechecking,
  onRecheck,
  onBack,
  onContinue,
}) {

  /*
  | The unmatched ids, most rows first. Built here rather than in the hook
  | because it is only ever looked at on this screen.
  */
  const unmatched = useMemo(() => {

    const ids = new Map();

    rows.forEach((row) => {

      if (row.employeeMatched) return;

      const id = row.employeeId || "(no employee ID)";

      const existing = ids.get(id);

      if (existing) {
        existing.count += 1;
        existing.rows.push(row.rowNumber);
        return;
      }

      ids.set(id, { id, count: 1, rows: [row.rowNumber] });

    });

    return [...ids.values()].sort((a, b) => b.count - a.count);

  }, [rows]);

  const inactive = useMemo(
    () =>
      [
        ...new Set(
          rows
            .filter((row) => row.employee && !row.employee.isActive)
            .map((row) => row.employee.name || row.employeeId)
        ),
      ].sort(),
    [rows]
  );

  const downloadUnmatched = () => {

    downloadCsv(
      "attendance-import-unmatched.csv",
      ["Employee ID", "Rows In File", "First Row"],
      unmatched.map((entry) => [
        entry.id,
        entry.count,
        entry.rows[0],
      ])
    );

  };

  const validating = busy === "validating";

  return (
    <div className="space-y-6">

      <ImportStatGrid>

        <ImportStatCard
          icon={<FiUsers />}
          tone="slate"
          label="Rows"
          value={summary.total}
          caption={`${summary.employees} employee IDs in the file`}
        />

        <ImportStatCard
          icon={<FiUserCheck />}
          tone="green"
          label="Matched"
          value={summary.matched}
          caption="Found in the employee directory"
        />

        <ImportStatCard
          icon={<FiUserX />}
          tone={summary.unmatched ? "red" : "slate"}
          label="Unmatched"
          value={summary.unmatched}
          caption={
            summary.unmatched
              ? `${unmatched.length} employee ${unmatched.length === 1 ? "ID" : "IDs"} not found`
              : "Every row found an employee"
          }
        />

        <ImportStatCard
          icon={<FiAlertTriangle />}
          tone={summary.inactive ? "amber" : "slate"}
          label="Inactive"
          value={summary.inactive}
          caption={
            summary.inactive
              ? "Will still be imported"
              : "No rows for inactive employees"
          }
        />

      </ImportStatGrid>

      {scope?.isScoped && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">You manage {scope.names.length ? scope.names.join(", ") : "no departments"}.</span>{" "}
            Rows for employees outside those departments cannot be imported and
            are listed as errors on the next step.
          </p>
        </div>
      )}

      {/* Everything matched */}
      {unmatched.length === 0 && (

        <div className="ui-card flex items-start gap-3 px-5 py-5 sm:px-6">

          <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600" size={20} />

          <div className="min-w-0">

            <p className="font-semibold text-ink">
              Every row matched an employee.
            </p>

            <p className="mt-0.5 text-sm text-ink-subtle">
              Next we check these {summary.total.toLocaleString()} rows against
              the attendance you already have.
            </p>

          </div>

        </div>

      )}

      {/*
        The message, when the file names employees the company does not have.

        Placed above the list rather than below it, because the list answers
        "which ones" and this answers "what now" - and somebody who has just
        been told that four hundred rows will not import needs the second
        answer first.

        It says what to do and nothing more. No employee is created from this
        screen, and nothing here offers to: an attendance row carries an id, a
        date and two times, while an employee needs a name, an email, a mobile
        number, a department, a designation, a joining date and an employment
        type. On-boarding is where those are collected, so on-boarding is where
        this sends people - and then they come back and import the history.
      */}
      {unmatched.length > 0 && (

        <div className="ui-card overflow-hidden border-amber-200">

          <div className="flex flex-col gap-4 bg-amber-50 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">

            <div className="flex min-w-0 items-start gap-3">

              <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600"
              >
                <FiUserPlus size={20} />
              </div>

              <div className="min-w-0">

                <h2 className="text-base font-semibold text-amber-900 sm:text-lg">
                  Please on-board these employees first
                </h2>

                <p className="mt-1 text-sm text-amber-800">
                  {unmatched.length} employee{" "}
                  {unmatched.length === 1 ? "ID" : "IDs"} in this file{" "}
                  {unmatched.length === 1 ? "does" : "do"} not exist in your
                  company yet. On-board{" "}
                  {unmatched.length === 1 ? "them" : "them"} from the
                  On-boarding module first, then import this attendance file
                  again.
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Attendance is stored against an employee ID, so the employee
                  has to exist before their history can be recorded. This
                  importer never creates an employee.
                </p>

              </div>

            </div>

            {/*
              The way back once they have been on-boarded. Not a numbered step
              and not the point of this panel - just so that returning does not
              mean uploading the file and mapping the columns all over again.
            */}
            <button
              type="button"
              onClick={onRecheck}
              disabled={rechecking}
              className="ui-btn ui-btn-secondary shrink-0 bg-white font-semibold"
            >
              <FiRefreshCw className={rechecking ? "animate-spin" : ""} />
              {rechecking ? "Re-checking..." : "Re-check Employees"}
            </button>

          </div>

          <p className="border-t border-line bg-surface-muted px-5 py-3 text-xs text-ink-subtle sm:px-6">
            You can also continue without them: the{" "}
            {summary.matched.toLocaleString()} matched{" "}
            {summary.matched === 1 ? "row" : "rows"} will import and these{" "}
            {summary.unmatched.toLocaleString()} will be skipped. Importing the
            same file again once the employees exist will add them.
          </p>

        </div>

      )}

      {/* The ones that did not */}
      {unmatched.length > 0 && (

        <div className="ui-card overflow-hidden">

          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div className="flex min-w-0 items-center gap-3">

              <div
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"
              >
                <FiUserX />
              </div>

              <div className="min-w-0">

                <h2 className="ui-card-title">Employees Not Found</h2>

                <p className="ui-card-subtitle">
                  These IDs are in your file but not in this company.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={downloadUnmatched}
              className="ui-btn ui-btn-secondary shrink-0 font-semibold"
            >
              <FiDownload />
              Download List
            </button>

          </div>

          <div className="ui-scroll max-h-80 overflow-auto">

            <table className="w-full border-collapse text-left text-sm">

              <thead className="sticky top-0 z-10">
                <tr className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">
                  <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Employee ID</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Rows</th>
                  <th scope="col" className="px-5 py-3 font-semibold sm:pr-6">First Row</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line-subtle">

                {unmatched.map((entry) => (

                  <tr key={entry.id}>

                    <td className="px-5 py-3 font-mono font-semibold text-ink sm:px-6">
                      {entry.id}
                    </td>

                    <td className="px-5 py-3 text-ink-muted">
                      {entry.count.toLocaleString()}
                    </td>

                    <td className="px-5 py-3 text-ink-subtle sm:pr-6">
                      {entry.rows[0]}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

      {/* Inactive employees, named rather than just counted */}
      {inactive.length > 0 && (

        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">

          <FiAlertTriangle className="mt-0.5 shrink-0" />

          <p>
            <span className="font-semibold">
              {inactive.length} inactive{" "}
              {inactive.length === 1 ? "employee" : "employees"}:
            </span>{" "}
            {inactive.slice(0, 6).join(", ")}
            {inactive.length > 6 && ` and ${inactive.length - 6} more`}. Their
            history will still be imported.
          </p>

        </div>

      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="ui-card flex flex-col gap-3 bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <button
          type="button"
          onClick={onBack}
          disabled={validating}
          className="ui-btn ui-btn-secondary"
        >
          <FiArrowLeft />
          Back to Mapping
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={validating || summary.matched === 0}
          className="ui-btn ui-btn-primary font-semibold"
        >
          {validating ? (
            <>
              <FiLoader className="animate-spin" />
              Checking existing attendance...
            </>
          ) : (
            "Validate Against Existing Attendance"
          )}
        </button>

      </div>

    </div>
  );

}

export default ImportMatchStep;
