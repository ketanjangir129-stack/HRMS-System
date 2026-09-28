import { db } from "../../firebase/firebase";
import { ref, get, push, update, query, orderByChild, limitToLast } from "firebase/database";

import {
  formatTime,
  getMonthNode,
  getMonthPath,
} from "../../utils/attendance/attendanceDate";
import { calculateWorkingHours } from "../../utils/attendance/attendanceUtils";
import { APPROVAL_STATUS } from "../../utils/attendance/attendanceConstants";
import {
  IMPORT_BATCH_SIZE,
  IMPORT_MODE,
  IMPORT_STATUS,
} from "../../utils/attendance/attendanceImportConstants";
import { toImportTimestamp } from "../../utils/attendance/attendanceImportNormalize";
import {
  getImportMonths,
  getImportableRows,
} from "../../utils/attendance/attendanceImportValidation";

/*
|--------------------------------------------------------------------------
| Attendance Import Service
|--------------------------------------------------------------------------
| The database half of the attendance importer: what already exists, what gets
| written, and the note left behind saying a run happened.
|
| It writes into the attendance branch `attendanceService` owns, and into the
| same records at the same path:
|
|   companies/{companyCode}/attendance/records/{year}/{Month}/{YYYY-MM-DD}/{employeeId}
|
| There is no separate tree for imported attendance and there is deliberately
| no second record shape. An imported day is a day of attendance: the daily
| list, the monthly report, the calendar, the approval queue, the analytics and
| the payroll summary all read that path, and a parallel branch would be
| invisible to every one of them.
|
| The record built below is field for field the one `attendanceService`'s own
| `buildAttendanceRecord` produces, and the two helpers that decide its derived
| values - `formatTime` and `calculateWorkingHours` - are imported from the
| same utilities rather than reimplemented, so an imported day and a punched
| day can never be computed differently.
|
| It is built here rather than exported from there because an imported day
| differs in two ways that only make sense for an import, and both are additive:
| it carries `source` and `importId` so a migrated day can be told from a lived
| one, and its status is always the one the file supplied. Nothing here ever
| calls `resolvePunchInStatus`: judging a punch from 2022 against the working
| day and grace period the company is on today would rewrite history to match
| the present, which is the opposite of what a migration is for.
|--------------------------------------------------------------------------
*/

const recordsPath = (companyCode) =>
  `companies/${companyCode}/attendance/records`;

const dayPath = (date, employeeId) =>
  `${getMonthPath(date)}/${date}/${employeeId}`;

const importsPath = (companyCode) =>
  `companies/${companyCode}/attendance/imports`;

/*
|--------------------------------------------------------------------------
| Errors
|--------------------------------------------------------------------------
| A raw Firebase error reads as "PERMISSION_DENIED: Permission denied", which
| is not something to put in front of somebody importing a payroll year. The
| known ones are named and everything else falls back to the caller's message,
| with the original left in the console.
|
| The same shape `holidayService` uses, deliberately.
*/

const describeError = (error, fallback) => {

  const code = String(error?.code || error?.message || "").toLowerCase();

  if (code.includes("permission_denied")) {
    return "You do not have permission to import attendance for this company.";
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    code.includes("disconnected") ||
    code.includes("timeout")
  ) {
    return "Network error. Check your connection and try again.";
  }

  if (code.includes("max_write_size") || code.includes("too large")) {
    return "This batch was too large for a single write. Try importing fewer rows at a time.";
  }

  return fallback;

};

const failWith = (error, context, fallback) => {

  console.error(`${context}:`, error);

  return new Error(describeError(error, fallback));

};

/*
|--------------------------------------------------------------------------
| Import Ids
|--------------------------------------------------------------------------
| A push key carries the millisecond it was made in plus a random component, so
| two people importing in the same instant cannot collide. Prefixed the way
| holidays and leave requests are, so an id says what it belongs to on sight.
*/

export const generateImportId = (companyCode) => {

  const key = push(ref(db, importsPath(companyCode))).key;

  return `ATT_IMPORT_${key}`;

};

/*
|--------------------------------------------------------------------------
| Existing Records
|--------------------------------------------------------------------------
| Which of the file's employee-and-day pairs already have attendance.
|
| Read by month, never by row. The records tree is date first and a month is a
| node of its own, so a file covering a year is twelve reads whatever its
| length: ten thousand rows do not become ten thousand reads, and a hundred
| thousand rows across three years is still thirty six.
|
| Only the days the file actually mentions are kept. A month node holds every
| employee's whole month, and holding all of that in memory beside the parsed
| file - for a company of two hundred, a year is a lot of days nobody asked
| about - is how a large import runs the tab out of memory.
|
| A month that cannot be read is not treated as an empty month. Doing that
| would report every day in it as new and, on the next screen, quietly
| overwrite records the importer simply failed to look at. The month is
| reported as unreadable and the import stops, which is recoverable; the
| alternative is not.
*/

export const getExistingAttendanceIndex = async (companyCode, rows = []) => {

  const months = getImportMonths(rows);

  if (!companyCode || months.length === 0) {
    return { existing: new Map(), months: 0 };
  }

  const wanted = new Set(
    rows
      .filter((row) => row.employeeId && row.date)
      .map((row) => `${row.employeeId}|${row.date}`)
  );

  const existing = new Map();

  try {

    /*
    | Sequential rather than a `Promise.all` over every month. A file spanning
    | five years would otherwise open sixty simultaneous reads against one
    | connection, and the months arrive slower for it rather than faster.
    */
    for (const { year, month } of months) {

      const node = getMonthNode(year, month);

      if (!node) continue;

      const snapshot = await get(
        ref(db, `${recordsPath(companyCode)}/${node}`)
      );

      if (!snapshot.exists()) continue;

      const days = snapshot.val();

      Object.entries(days).forEach(([date, employees]) => {

        Object.entries(employees || {}).forEach(([employeeId, record]) => {

          const key = `${employeeId}|${date}`;

          if (!wanted.has(key)) return;

          /*
          | Only the three fields anything downstream asks about: whether the
          | day is linked to a leave request, what it currently says, and when
          | it was first recorded so a replacement can keep it.
          */
          existing.set(key, {
            status: record?.status || "",
            leaveRequestId: record?.leaveRequestId || "",
            createdAt: record?.createdAt || null,
          });

        });

      });

    }

  } catch (error) {

    throw failWith(
      error,
      "Attendance Import - existing record check",
      "Could not check which days already have attendance. Nothing has been imported."
    );

  }

  return { existing, months: months.length };

};

/*
|--------------------------------------------------------------------------
| The Record
|--------------------------------------------------------------------------
| Firebase rejects `undefined`, so every field is written explicitly - the
| same reason `attendanceService` writes its record out in full.
|
| `createdAt` is when the row was written to this database, not the day it
| describes. The day it describes is the `date` field and the node the record
| lives in; back-dating `createdAt` to it would make a record imported today
| claim it was recorded in 2022, and every ordering and audit that reads
| `createdAt` would believe it.
|
| The approval is Approved and signed by whoever ran the import, following the
| rule `attendanceService` sets out for every writer that is not a self
| reported punch: HR marking a day by hand, an approver applying a correction
| and the leave module booking approved leave are all written Approved, because
| all three were decided by somebody entitled to decide. An import is the same
| act over a year of days. Left Pending, a migration would drop every imported
| day out of Present, Late and Half Day - `getAttendanceSummary` counts a
| pending day as pending and nothing else - and put a decade of history into
| the approval queue.
*/

const buildImportedRecord = (row, { importId, importedBy }) => {

  const punchIn = toImportTimestamp(row.date, row.punchInMinutes);

  const punchOut = toImportTimestamp(row.date, row.punchOutMinutes);

  return {

    employeeId: row.employeeId,

    date: row.date,

    punchIn,
    punchInTime: punchIn ? formatTime(punchIn) : "",

    punchOut,
    punchOutTime: punchOut ? formatTime(punchOut) : "",

    workingHours: calculateWorkingHours(punchIn, punchOut),

    /*
    | Always the status the file supplied, or the one the validator assumed and
    | warned about. Never derived from the company's current working day.
    */
    status: row.status,

    remarks: row.remarks || "",

    approvalStatus: APPROVAL_STATUS.APPROVED,
    approvedBy: importedBy || "",
    approvedAt: Date.now(),
    approvalRemarks: "Imported attendance",

    createdAt: Date.now(),

    /*
    | The two additive fields, and the only two. Everything else on this record
    | is a field a punched day already carries, so nothing that reads attendance
    | has to know an import ever happened - while anything that wants to can
    | tell a migrated day from a lived one, and trace it back to the run that
    | brought it in.
    */
    source: "IMPORT",

    importId,

  };

};

/*
|--------------------------------------------------------------------------
| Writing
|--------------------------------------------------------------------------
| Rows are written as multi location updates, a batch at a time.
|
| One `set` per row would be one request per row: ten thousand days would be
| ten thousand round trips, which is somewhere north of an hour and a tab
| nobody can use while it runs. One update for the whole file is the other
| failure - a single request large enough to be rejected, or to time out and
| lose every row with it.
|
| So the file is written in batches of `IMPORT_BATCH_SIZE`, and each batch is
| one request rooted at the records node with a path per day underneath it.
| Firebase applies a multi location update atomically, so a batch either lands
| completely or not at all: a failed batch leaves no half written days behind.
|
| The batches themselves are not atomic with each other, and cannot be made so
| from a browser. That is stated rather than hidden - `onProgress` reports each
| batch as it lands, a failed batch does not stop the ones after it, and the
| result names exactly which rows were written and which were not so the run
| can be finished rather than started again.
*/

const chunk = (items, size) => {

  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;

};

export const importAttendanceRecords = async (
  companyCode,
  rows = [],
  {
    mode = IMPORT_MODE.SKIP,
    importId,
    importedBy = "",
    onProgress,
    signal,
  } = {}
) => {

  const importable = getImportableRows(rows, mode);

  const total = importable.length;

  const result = {
    total,
    imported: 0,
    failed: 0,
    processed: 0,
    failedRows: [],
    batches: { total: 0, succeeded: 0, failed: 0 },
    cancelled: false,
  };

  if (!companyCode || total === 0) {
    return result;
  }

  const batches = chunk(importable, IMPORT_BATCH_SIZE);

  result.batches.total = batches.length;

  onProgress?.({ ...result });

  for (let index = 0; index < batches.length; index += 1) {

    /*
    | Checked between batches rather than inside one. A batch is a single
    | atomic write - there is nothing to stop halfway through - so the only
    | honest place to stop is on a boundary, with everything before it written
    | and everything after it untouched.
    */
    if (signal?.aborted) {
      result.cancelled = true;
      break;
    }

    const batch = batches[index];

    const updates = {};

    batch.forEach((row) => {

      updates[dayPath(row.date, row.employeeId)] = buildImportedRecord(row, {
        importId,
        importedBy,
      });

    });

    try {

      await update(ref(db, recordsPath(companyCode)), updates);

      result.imported += batch.length;

      result.batches.succeeded += 1;

    } catch (error) {

      console.error(
        `Attendance import batch ${index + 1} of ${batches.length} failed:`,
        error
      );

      result.failed += batch.length;

      result.batches.failed += 1;

      result.failedRows.push(...batch);

      /*
      | The remaining batches are still attempted. One rejected write is very
      | often one bad batch rather than a broken connection, and stopping would
      | throw away every day after it for no reason - the result says exactly
      | what did not land either way.
      */

    }

    result.processed += batch.length;

    onProgress?.({ ...result });

  }

  return result;

};

/*
|--------------------------------------------------------------------------
| Import History
|--------------------------------------------------------------------------
| companies/{companyCode}/attendance/imports/{importId}
|
| A fourth leaf beside `records`, `requests` and `settings`, and additive: the
| three existing ones are read by path and none of them enumerates the
| attendance node, so nothing that works today can see this appear.
|
| Metadata only. The file is not stored, and neither are its rows: a hundred
| thousand rows of somebody's attendance history under a history node would be
| downloaded in full by anything that ever opened the list, and the rows are
| already in the records tree where they belong. What is kept is what a run
| needs to be accountable for - who ran it, over what file, and what happened.
|
| A failure to write this note is never allowed to fail the import. The
| attendance is already in; losing the audit entry is recoverable and worth a
| console error, whereas reporting a completed import as failed is not.
*/

const buildImportRun = ({
  importId,
  fileName,
  fileSize,
  mode,
  importedBy,
  totalRows,
  importedRows,
  skippedRows,
  failedRows,
  invalidRows,
  status,
  dateRange,
}) => ({

  importId,

  fileName: String(fileName || "").slice(0, 200),

  fileSize: fileSize || 0,

  mode,

  uploadedBy: importedBy || "",

  uploadedAt: Date.now(),

  totalRows: totalRows || 0,

  importedRows: importedRows || 0,

  skippedRows: skippedRows || 0,

  failedRows: failedRows || 0,

  invalidRows: invalidRows || 0,

  fromDate: dateRange?.from || "",

  toDate: dateRange?.to || "",

  status,

});

export const startImportRun = async (companyCode, run) => {

  try {

    await update(
      ref(db, `${importsPath(companyCode)}/${run.importId}`),
      buildImportRun({ ...run, status: IMPORT_STATUS.PROCESSING })
    );

    return { success: true };

  } catch (error) {

    console.error("Failed to record the start of an attendance import:", error);

    return { success: false };

  }

};

export const completeImportRun = async (companyCode, run) => {

  try {

    await update(
      ref(db, `${importsPath(companyCode)}/${run.importId}`),
      buildImportRun(run)
    );

    return { success: true };

  } catch (error) {

    console.error("Failed to record the result of an attendance import:", error);

    return { success: false };

  }

};

/*
| The most recent runs, newest first.
|
| Ordered and limited by the database rather than in the browser, so opening
| the history downloads the last twenty entries and not every import a company
| has ever run.
*/

export const getImportHistory = async (companyCode, limit = 20) => {

  try {

    if (!companyCode) return [];

    const snapshot = await get(
      query(
        ref(db, importsPath(companyCode)),
        orderByChild("uploadedAt"),
        limitToLast(limit)
      )
    );

    if (!snapshot.exists()) return [];

    return Object.values(snapshot.val()).sort(
      (a, b) => (b?.uploadedAt || 0) - (a?.uploadedAt || 0)
    );

  } catch (error) {

    throw failWith(
      error,
      "Attendance Import - history",
      "Could not load the import history."
    );

  }

};
