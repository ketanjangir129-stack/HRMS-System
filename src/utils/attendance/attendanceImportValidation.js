import { ATTENDANCE_STATUS } from "./attendanceConstants";
import { getDateKey } from "./attendanceDate";
import { isDepartmentInScope } from "../permissions/departmentScope";
import {
  IMPORT_FIELD,
  IMPORT_MODE,
  ROW_OUTCOME,
  TIME_OPTIONAL_STATUSES,
} from "./attendanceImportConstants";
import {
  formatImportMinutes,
  normalizeEmployeeId,
  normalizeImportDate,
  normalizeImportStatus,
  normalizeImportTime,
} from "./attendanceImportNormalize";

/*
|--------------------------------------------------------------------------
| Attendance Import - Validation
|--------------------------------------------------------------------------
| Every judgement made about a row, in the order the wizard makes them:
|
|   buildImportRows        what the file says, read through the mapping
|   matchImportRows        which of those rows belong to a real employee
|   markInternalDuplicates the same employee and day twice in one file
|   applyExistingRecords   the same employee and day already in the database
|   summarizeImportRows    the counts the preview and the confirmation show
|
| Split that way because each step needs something the one before it did not:
| matching needs the employee directory, and the existing record check needs
| the database. Keeping them apart is what lets the wizard show the user
| something after each one instead of a single spinner.
|
| Pure throughout - no Firebase, no React. The service fetches, this file
| decides, and the same decision can therefore be re-run in the preview, in the
| confirmation and in the service before a write without any chance of the
| three disagreeing.
|
| Errors stop a row. Warnings do not: they are things worth knowing that are
| not reasons to refuse historical data - somebody who has since left the
| company, a day the office was closed that somebody worked anyway, a legacy
| export that carried statuses but no punch times.
|--------------------------------------------------------------------------
*/

const addError = (row, message) => {
  row.errors.push(message);
};

const addWarning = (row, message) => {
  row.warnings.push(message);
};

/*
|--------------------------------------------------------------------------
| Step One - Read The File Through The Mapping
|--------------------------------------------------------------------------
| The raw cells become a row with a date key, two times in minutes and a
| status, plus everything that could not be read.
|
| `source` keeps every mapped cell exactly as it appeared in the file. The
| error report is built from it, and a report that showed the value the
| importer derived rather than the value the user typed would send them looking
| for something that is not in their file.
*/

export const buildImportRows = ({
  rows = [],
  mapping = {},
  dateFormat,
  statusOverrides = {},
}) => {

  const cellAt = (cells, field) => {

    const index = mapping[field];

    if (index === undefined || index === null) return "";

    return cells[index] ?? "";

  };

  const today = getDateKey();

  return rows.map((row) => {

    const source = {
      employeeId: cellAt(row.cells, IMPORT_FIELD.EMPLOYEE_ID),
      date: cellAt(row.cells, IMPORT_FIELD.DATE),
      punchIn: cellAt(row.cells, IMPORT_FIELD.PUNCH_IN),
      punchOut: cellAt(row.cells, IMPORT_FIELD.PUNCH_OUT),
      status: cellAt(row.cells, IMPORT_FIELD.STATUS),
      remarks: cellAt(row.cells, IMPORT_FIELD.REMARKS),
    };

    const result = {

      rowNumber: row.rowNumber,

      source,

      employeeId: normalizeEmployeeId(source.employeeId),

      date: "",

      punchInMinutes: null,
      punchOutMinutes: null,

      status: "",

      remarks: String(source.remarks ?? "").trim(),

      employeeMatched: false,
      employee: null,

      isDuplicate: false,
      isExisting: false,
      isConflict: false,

      errors: [],
      warnings: [],

    };

    /*
    |----------------------------------------------------------------------
    | Employee id
    |----------------------------------------------------------------------
    | Only its presence is checked here. Whether it names somebody is a
    | question for the directory, which this step does not have.
    */

    if (!result.employeeId) {
      addError(result, "Employee ID is missing.");
    }

    /*
    |----------------------------------------------------------------------
    | Date
    |----------------------------------------------------------------------
    */

    const date = normalizeImportDate(source.date, dateFormat);

    if (date.date) {

      result.date = date.date;

      /*
      | Attendance cannot be recorded for a day that has not happened. The
      | manual form refuses a future date for the same reason, and a migration
      | carrying one is a date that was read wrongly rather than a day somebody
      | worked in advance.
      */
      if (result.date > today) {
        addError(result, "Date is in the future.");
      }

    } else {

      result.dateAmbiguous = Boolean(date.ambiguous);

      addError(result, date.error || "Date could not be read.");

    }

    /*
    |----------------------------------------------------------------------
    | Punch times
    |----------------------------------------------------------------------
    */

    const punchIn = normalizeImportTime(source.punchIn);

    if (punchIn.error) {
      addError(result, `Punch in: ${punchIn.error}`);
    } else if (punchIn.minutes !== undefined) {
      result.punchInMinutes = punchIn.minutes;
    }

    const punchOut = normalizeImportTime(source.punchOut);

    if (punchOut.error) {
      addError(result, `Punch out: ${punchOut.error}`);
    } else if (punchOut.minutes !== undefined) {
      result.punchOutMinutes = punchOut.minutes;
    }

    /*
    |----------------------------------------------------------------------
    | Status
    |----------------------------------------------------------------------
    | A status that nothing recognises is an error rather than a guess. The
    | mapping step collects every one of them and asks, so by the time a row
    | reaches here unresolved the user has been given the chance to say what it
    | means and has not taken it.
    */

    const status = normalizeImportStatus(source.status, statusOverrides);

    if (status.unresolved) {
      addError(
        result,
        `"${status.unresolved}" is not a status the importer recognises. Map it on the previous step.`
      );
    } else if (status.status) {
      result.status = status.status;
    }

    return result;

  });

};

/*
|--------------------------------------------------------------------------
| Punch And Status Rules
|--------------------------------------------------------------------------
| Applied after the status is known, because what a missing punch time means
| depends entirely on what the day was.
|
| Run as its own pass rather than inside the builder above so that a status
| supplied by the file and a status assumed for a row with no status column are
| judged by exactly the same rules.
*/

const applyDayRules = (row) => {

  const hasIn = row.punchInMinutes !== null;

  const hasOut = row.punchOutMinutes !== null;

  /*
  | A punch out with nothing to measure it from. The record would carry a
  | leaving time, no arrival and no hours, and every report that reads it would
  | show a day that cannot have happened.
  */
  if (!hasIn && hasOut) {
    addError(
      row,
      "Punch out has no punch in to go with it."
    );
  }

  if (hasIn && hasOut && row.punchOutMinutes <= row.punchInMinutes) {
    addError(
      row,
      "Punch out is not after punch in."
    );
  }

  /*
  | A day that was started and never closed. Kept rather than refused: the
  | record shape already allows it - a live punch in sits exactly like this all
  | day - and a legacy system that lost its punch outs is precisely the thing
  | being migrated away from. The hours simply cannot be worked out, which is
  | what the warning says.
  */
  if (hasIn && !hasOut) {
    addWarning(
      row,
      "No punch out, so no working hours can be recorded for this day."
    );
  }

  if (!row.status) {

    /*
    | The file gave no status for this day.
    |
    | With a punch in, the day is recorded as Present and said so out loud.
    | Deriving Present or Late from the punch time instead would judge a day
    | from years ago against the working day and grace period the company is on
    | today, which is the one thing a historical import must never do.
    |
    | With nothing at all, there is no honest answer and the row is stopped.
    */

    if (hasIn) {

      row.status = ATTENDANCE_STATUS.PRESENT;

      row.statusAssumed = true;

      addWarning(
        row,
        "No status in the file, so this day is recorded as Present. Late is never derived from today's working hours for imported days."
      );

    } else {

      addError(
        row,
        "No status and no punch times, so there is nothing to record for this day."
      );

    }

    return;

  }

  /*
  | A day of attendance with no evidence of attendance. Absent and Leave are
  | expected to have no times - `attendanceUtils.isTimeOptionalStatus` says the
  | same - and the rest are warned about rather than refused, because a
  | statuses-only export is the commonest shape a legacy system hands over and
  | the module already stores days in that shape whenever leave is approved.
  */
  if (
    !hasIn &&
    !hasOut &&
    !TIME_OPTIONAL_STATUSES.includes(row.status)
  ) {
    addWarning(
      row,
      `Marked ${row.status} with no punch times, so this day will have no working hours.`
    );
  }

  /*
  | Times on a day nobody was at work. The times are kept - they are what the
  | file said - but the pairing is usually a mapping mistake or a status that
  | meant something else in the old system.
  */
  if (
    (hasIn || hasOut) &&
    TIME_OPTIONAL_STATUSES.includes(row.status)
  ) {
    addWarning(
      row,
      `Marked ${row.status} but the file also gives punch times.`
    );
  }

};

/*
|--------------------------------------------------------------------------
| Step Two - Employee Matching
|--------------------------------------------------------------------------
| Rows are matched on the employee id and on nothing else.
|
| A name or an email is not an identity: two people share a name far more often
| than a migration can survive, and matching on one would attach somebody's
| attendance history to a colleague. Both are still read when the file carries
| them, but only to warn that the row and the directory disagree - never to
| decide who the row belongs to.
|
| The directory is a `{ [employeeId]: employee }` map built once by
| `buildEmployeeDirectory`, so this is a lookup per row rather than a scan, and
| no row causes a database read of its own.
|
| `scope` is the signed in user's department scope. A manager may only import
| for the departments they run, so a row outside it is refused here rather than
| at the write - the user is told which rows they cannot import while they can
| still do something about it.
*/

export const matchImportRows = (
  rows = [],
  { directory = {}, scope = null } = {}
) => {

  rows.forEach((row) => {

    if (!row.employeeId) {
      applyDayRules(row);
      return;
    }

    const employee = directory[row.employeeId];

    if (!employee) {

      addError(
        row,
        `No employee with ID ${row.employeeId} exists in this company.`
      );

      applyDayRules(row);

      return;

    }

    row.employeeMatched = true;

    row.employee = employee;

    /*
    | Somebody who has left. Their history is exactly what a migration is
    | carrying, so this is worth knowing and is not a reason to drop the row.
    */
    if (!employee.isActive) {
      addWarning(
        row,
        `${employee.name || row.employeeId} is not an active employee.`
      );
    }

    if (scope?.isScoped && !isDepartmentInScope(scope, employee.department)) {
      addError(
        row,
        `${employee.name || row.employeeId} is in ${employee.department || "no department"}, which you do not manage.`
      );
    }

    applyDayRules(row);

  });

  return rows;

};

/*
|--------------------------------------------------------------------------
| Step Three - Duplicates Inside The File
|--------------------------------------------------------------------------
| One employee can have one record per day, because the employee and the day
| together are the address the record is written to. A file listing the same
| pair twice would have its second row silently overwrite its first inside a
| single batch, so the second and every one after it is marked instead.
|
| The first occurrence is kept and imported. Which one is "first" is the order
| they appear in the file, which is the only order the user can see.
|
| A `Set` of `employeeId|date`, so a hundred thousand rows are checked in one
| pass rather than compared against each other.
*/

export const markInternalDuplicates = (rows = []) => {

  const seen = new Map();

  rows.forEach((row) => {

    if (!row.employeeId || !row.date) return;

    const key = `${row.employeeId}|${row.date}`;

    const first = seen.get(key);

    if (first === undefined) {
      seen.set(key, row.rowNumber);
      return;
    }

    row.isDuplicate = true;

    addError(
      row,
      `Row ${first} already has ${row.employeeId} on ${row.date}.`
    );

  });

  return rows;

};

/*
|--------------------------------------------------------------------------
| Step Four - Records That Already Exist
|--------------------------------------------------------------------------
| `existing` is the `{ "employeeId|date": record }` index the service builds
| from the months the file touches. One read per month covers every row in it,
| so this is a lookup rather than a read.
|
| Three things can be true of a day that already has a record:
|
|   it is linked to approved leave   never overwritten, whatever the mode
|   the mode is Skip                 left alone, and the row is not imported
|   the mode is Replace              overwritten, and the row is imported
|
| The leave case is first and is deliberately not something the mode can
| override. A record carrying `leaveRequestId` was written when a leave request
| was approved, and `clearLeaveAttendance` gives that day back by looking for
| exactly those two fields when the leave is deleted. An import that wrote over
| it would break the link, and the day would then stay booked as leave after
| the leave that booked it had been cancelled.
|
| Holidays are the opposite case: a warning and nothing more. Somebody working
| on a declared holiday is unusual, not impossible, and refusing the row would
| silently drop a day they should be paid for.
*/

export const applyExistingRecords = (
  rows = [],
  {
    existing = new Map(),
    holidaySet = new Set(),
    mode = IMPORT_MODE.SKIP,
  } = {}
) => {

  rows.forEach((row) => {

    if (!row.employeeId || !row.date) return;

    if (holidaySet.has(row.date)) {
      addWarning(
        row,
        "This day is a declared company holiday."
      );
    }

    /*
    | A duplicate has already been stopped and its first occurrence is the row
    | that speaks for this day, so checking it against the database again would
    | report the same existing record twice.
    */
    if (row.isDuplicate) return;

    const record = existing.get(`${row.employeeId}|${row.date}`);

    if (!record) return;

    row.isExisting = true;

    row.existingRecord = record;

    if (record.leaveRequestId) {

      row.isConflict = true;

      addError(
        row,
        "This day is already recorded against an approved leave request and cannot be overwritten by an import."
      );

      return;

    }

    if (mode === IMPORT_MODE.REPLACE) {

      addWarning(
        row,
        `This day already has attendance (${record.status || "no status"}) and will be replaced.`
      );

      return;

    }

    addWarning(
      row,
      `This day already has attendance (${record.status || "no status"}) and will be skipped.`
    );

  });

  return rows;

};

/*
|--------------------------------------------------------------------------
| Outcomes
|--------------------------------------------------------------------------
| Exactly one outcome per row, decided in order of how much it matters, so the
| filters on the preview always add up to the total.
|
| A row that will not be written for any reason is never NEW, which is what
| makes "New" on the confirmation dialog a promise rather than an estimate.
*/

export const getRowOutcome = (row, mode = IMPORT_MODE.SKIP) => {

  if (row.isConflict) return ROW_OUTCOME.CONFLICT;

  if (row.isDuplicate) return ROW_OUTCOME.DUPLICATE;

  if (!row.employeeMatched) return ROW_OUTCOME.UNMATCHED;

  if (row.errors.length > 0) return ROW_OUTCOME.INVALID;

  if (row.isExisting && mode === IMPORT_MODE.SKIP) {
    return ROW_OUTCOME.EXISTING;
  }

  return ROW_OUTCOME.NEW;

};

export const isImportable = (row, mode = IMPORT_MODE.SKIP) =>
  getRowOutcome(row, mode) === ROW_OUTCOME.NEW;

/*
| The rows that will actually be written, in file order.
*/

export const getImportableRows = (rows = [], mode = IMPORT_MODE.SKIP) =>
  rows.filter((row) => isImportable(row, mode));

/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
| Every count the wizard shows, worked out in one pass over the rows rather
| than in six filters that would each walk the whole file.
*/

export const summarizeImportRows = (rows = [], mode = IMPORT_MODE.SKIP) => {

  const summary = {
    total: rows.length,
    valid: 0,
    warnings: 0,
    errors: 0,
    matched: 0,
    unmatched: 0,
    inactive: 0,
    duplicates: 0,
    existing: 0,
    conflicts: 0,
    newRecords: 0,
    replaced: 0,
    ambiguousDates: 0,
    employees: 0,
    dates: 0,
    firstDate: "",
    lastDate: "",
  };

  const employees = new Set();

  const dates = new Set();

  rows.forEach((row) => {

    const outcome = getRowOutcome(row, mode);

    if (row.employeeMatched) {
      summary.matched += 1;
    } else {
      summary.unmatched += 1;
    }

    if (row.employee && !row.employee.isActive) {
      summary.inactive += 1;
    }

    if (row.dateAmbiguous) summary.ambiguousDates += 1;

    if (row.warnings.length > 0) summary.warnings += 1;

    if (row.errors.length > 0) summary.errors += 1;

    if (row.errors.length === 0) summary.valid += 1;

    switch (outcome) {

      case ROW_OUTCOME.CONFLICT:
        summary.conflicts += 1;
        break;

      case ROW_OUTCOME.DUPLICATE:
        summary.duplicates += 1;
        break;

      case ROW_OUTCOME.EXISTING:
        summary.existing += 1;
        break;

      case ROW_OUTCOME.NEW:
        summary.newRecords += 1;
        if (row.isExisting) summary.replaced += 1;
        break;

      default:
        break;

    }

    if (row.employeeId) employees.add(row.employeeId);

    if (row.date) dates.add(row.date);

  });

  summary.employees = employees.size;

  summary.dates = dates.size;

  if (dates.size > 0) {

    const sorted = [...dates].sort();

    summary.firstDate = sorted[0];

    summary.lastDate = sorted[sorted.length - 1];

  }

  return summary;

};

/*
| Every month the file touches, as `{ year, month }`, so the service knows
| which month nodes to read for the existing record check.
|
| Taken off the front of the date key rather than parsed through a `Date`, the
| same way `getMonthPath` does it: the key is already local time and a round
| trip through `Date` would put a timezone back into it.
*/

export const getImportMonths = (rows = []) => {

  const months = new Map();

  rows.forEach((row) => {

    if (!row.date) return;

    const key = row.date.slice(0, 7);

    if (months.has(key)) return;

    months.set(key, {
      year: Number(row.date.slice(0, 4)),
      month: Number(row.date.slice(5, 7)),
    });

  });

  return [...months.values()];

};

/*
| The calendar years the file touches, for the holiday read.
*/

export const getImportYears = (rows = []) => [
  ...new Set(
    rows
      .filter((row) => row.date)
      .map((row) => Number(row.date.slice(0, 4)))
  ),
];

/*
|--------------------------------------------------------------------------
| Filters
|--------------------------------------------------------------------------
| What the preview's tabs show. Kept here beside the outcomes so a tab can
| never drift from the count on the card above it.
*/

export const PREVIEW_FILTER = {
  ALL: "all",
  VALID: "valid",
  WARNINGS: "warnings",
  ERRORS: "errors",
  DUPLICATES: "duplicates",
  EXISTING: "existing",
  UNMATCHED: "unmatched",
  CONFLICTS: "conflicts",
};

export const filterPreviewRows = (
  rows = [],
  filter = PREVIEW_FILTER.ALL,
  mode = IMPORT_MODE.SKIP
) => {

  switch (filter) {

    case PREVIEW_FILTER.VALID:
      return rows.filter((row) => isImportable(row, mode));

    case PREVIEW_FILTER.WARNINGS:
      return rows.filter((row) => row.warnings.length > 0);

    case PREVIEW_FILTER.ERRORS:
      return rows.filter((row) => row.errors.length > 0);

    case PREVIEW_FILTER.DUPLICATES:
      return rows.filter((row) => row.isDuplicate);

    case PREVIEW_FILTER.EXISTING:
      return rows.filter((row) => row.isExisting);

    case PREVIEW_FILTER.UNMATCHED:
      return rows.filter((row) => !row.employeeMatched);

    case PREVIEW_FILTER.CONFLICTS:
      return rows.filter((row) => row.isConflict);

    default:
      return rows;

  }

};

/*
|--------------------------------------------------------------------------
| Error Report
|--------------------------------------------------------------------------
| The rows that will not be imported, as the table `downloadCsv` writes.
|
| Every column holds the value as it appeared in the file, never the value the
| importer derived from it: the point of this file is to be opened beside the
| original and corrected, and a date the user never typed is no help at all.
*/

export const ERROR_REPORT_HEADER = [
  "Row Number",
  "Employee ID",
  "Date",
  "Punch In",
  "Punch Out",
  "Status",
  "Remarks",
  "Outcome",
  "Errors",
  "Warnings",
];

const OUTCOME_LABELS = {
  [ROW_OUTCOME.NEW]: "Will be imported",
  [ROW_OUTCOME.EXISTING]: "Already recorded - skipped",
  [ROW_OUTCOME.DUPLICATE]: "Duplicate row in this file",
  [ROW_OUTCOME.UNMATCHED]: "Employee not found",
  [ROW_OUTCOME.INVALID]: "Invalid",
  [ROW_OUTCOME.CONFLICT]: "Conflicts with approved leave",
};

export const getOutcomeLabel = (outcome) =>
  OUTCOME_LABELS[outcome] || outcome;

const toReportRow = (row, mode) => [
  row.rowNumber,
  row.source.employeeId,
  row.source.date,
  row.source.punchIn,
  row.source.punchOut,
  row.source.status,
  row.source.remarks,
  getOutcomeLabel(getRowOutcome(row, mode)),
  row.errors.join(" | "),
  row.warnings.join(" | "),
];

/*
| Everything that will not be written, which is what somebody fixing a file
| needs: the invalid rows, the unmatched employees, the duplicates and the
| leave conflicts. Rows that were skipped only because the day already has
| attendance are left out - there is nothing to fix about those.
*/

export const buildErrorReport = (rows = [], mode = IMPORT_MODE.SKIP) =>
  rows
    .filter((row) => {

      const outcome = getRowOutcome(row, mode);

      return (
        outcome !== ROW_OUTCOME.NEW && outcome !== ROW_OUTCOME.EXISTING
      );

    })
    .map((row) => toReportRow(row, mode));

/*
| The rows a batch could not write, exported so the user can retry exactly
| those instead of re-importing a file they know most of succeeded.
*/

export const buildFailedReport = (rows = [], mode = IMPORT_MODE.SKIP) =>
  rows.map((row) => toReportRow(row, mode));

/*
|--------------------------------------------------------------------------
| Preview Display
|--------------------------------------------------------------------------
| A row flattened into what the preview table renders. Derived rather than
| stored on the row, so the row itself stays the record of what the file said.
*/

export const toPreviewRow = (row, mode = IMPORT_MODE.SKIP) => ({

  ...row,

  outcome: getRowOutcome(row, mode),

  employeeName: row.employee?.name || "",

  department: row.employee?.department || "",

  punchInLabel: formatImportMinutes(row.punchInMinutes) || "",

  punchOutLabel: formatImportMinutes(row.punchOutMinutes) || "",

});
