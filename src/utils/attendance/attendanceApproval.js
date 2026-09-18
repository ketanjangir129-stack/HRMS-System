import {
    APPROVAL_STATUS,
    ATTENDANCE_STATUS,
} from "./attendanceConstants";
import {
    formatTime,
    getDateKey,
    getMonthDateKeys,
} from "./attendanceDate";
import {
    getApprovalLabel,
    getApprovalStatus,
} from "./attendanceUtils";

/*
|--------------------------------------------------------------------------
| Attendance Approval
|--------------------------------------------------------------------------
| The queue behind the Attendance Approval screen, as pure functions.
|
| Daily approval already exists - `attendanceUtils` decides what a decision is
| worth and `attendanceService` writes it - and none of that is repeated here.
| What was missing was the desk: a period rather than a single day, a queue
| that can be filtered down to what is still waiting, and a set that can be
| signed off in one action. That is what this file is.
|
| Nothing here reads Firebase and nothing here reads the signed in user. A
| month of records goes in, rows come out, and the screen decides what to draw
| - which is what lets the same helpers answer for the cards, the tabs, the
| table, the bulk bar and the export without any of them counting twice.
|--------------------------------------------------------------------------
*/

/*
| A holiday and a weekly off are derived for a day that has no record, so
| neither is ever stored and neither can reach this file. The guard stays
| because the queue must never be able to ask somebody to sign off a day the
| office was closed, whatever a future writer decides to store.
*/

const NON_WORKING_STATUSES = [
    ATTENDANCE_STATUS.HOLIDAY,
    ATTENDANCE_STATUS.WEEKLY_OFF,
];

export const isReviewableDay = (record) =>
    Boolean(record?.employeeId) &&
    Boolean(record?.date) &&
    !NON_WORKING_STATUSES.includes(record?.status);

/*
| The identity of a row. A day of attendance is located by its date and its
| employee - there is no id on the record - so the pair is what the selection
| set, the busy flag and the table's row key are all keyed on.
*/

export const getRecordKey = (record) =>
    `${record?.date || ""}-${record?.employeeId || ""}`;

/*
|--------------------------------------------------------------------------
| The Period
|--------------------------------------------------------------------------
| A month is read as one node, so the screen loads a month and then narrows
| it. Both halves of the range are plain `YYYY-MM-DD` keys, which compare
| correctly as strings, so no date is ever parsed to filter a list.
*/

export const flattenMonthRecords = (monthRecords = {}) => {

    const rows = [];

    Object.entries(monthRecords).forEach(([date, dayRecords]) => {

        Object.values(dayRecords || {}).forEach((record) => {

            /*
            | The date is taken off the node rather than trusted from the
            | record: the node is the path the day was written to, and a
            | record whose own field drifted would otherwise be decided
            | against a day it does not live on.
            */
            const row = { ...record, date };

            if (isReviewableDay(row)) {
                rows.push(row);
            }

        });

    });

    /*
    | Newest day first, and alphabetical within a day. A reviewer works down
    | from what just happened, so the most recent day is the top of the queue.
    */
    return rows.sort(
        (a, b) =>
            b.date.localeCompare(a.date) ||
            String(a.employeeId).localeCompare(String(b.employeeId))
    );

};

/*
| The period a month opens on: the whole month, cut off at today when the
| month being read is the running one. A queue that offers tomorrow is a queue
| with a week of empty rows at the top of it.
*/

export const getMonthRange = (year, month) => {

    const dateKeys = getMonthDateKeys(year, month);

    const from = dateKeys[0] || "";

    const last = dateKeys[dateKeys.length - 1] || "";

    const today = getDateKey();

    return {
        from,
        to: last > today ? today : last,
    };

};

export const filterByDateRange = (rows = [], from = "", to = "") =>
    rows.filter(
        (row) =>
            (!from || row.date >= from) &&
            (!to || row.date <= to)
    );

/*
| The queue tab. An empty status is "everything", which is the tab that reads
| the period as a record rather than as a decision list.
*/

export const filterByApproval = (rows = [], status = "") =>
    !status
        ? rows
        : rows.filter((row) => getApprovalStatus(row) === status);

/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
| Counted on the resolved decision, not on the stored field, so a day recorded
| before daily approval existed is counted as Approved - which is exactly how
| every rate in the module is already counting it.
*/

export const getApprovalSummary = (rows = []) => {

    const summary = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: rows.length,
    };

    rows.forEach((row) => {

        const status = getApprovalStatus(row);

        if (status === APPROVAL_STATUS.PENDING) {
            summary.pending++;
            return;
        }

        if (status === APPROVAL_STATUS.REJECTED) {
            summary.rejected++;
            return;
        }

        summary.approved++;

    });

    const percentage = (value) =>
        summary.total === 0
            ? 0
            : Math.round((value / summary.total) * 100);

    return {

        ...summary,

        pendingPercentage: percentage(summary.pending),

        approvedPercentage: percentage(summary.approved),

        rejectedPercentage: percentage(summary.rejected),

        /*
        | How much of the period has been looked at. It is the number the desk
        | is actually judged on: a high approved count means nothing while
        | half the month is still sitting in the queue behind it.
        */
        reviewedPercentage: percentage(
            summary.approved + summary.rejected
        ),

    };

};

/*
|--------------------------------------------------------------------------
| Bulk Approval
|--------------------------------------------------------------------------
| The service signs off a whole day at a time - one multi location write per
| date - so a selection that spans a fortnight is grouped back into the days
| it belongs to before it is written.
|
| `{ [date]: employeeId[] }`, which is exactly the shape `approveAttendanceDay`
| takes one date at a time.
*/

export const groupEmployeesByDate = (rows = []) =>
    rows.reduce((groups, row) => {

        if (!row?.date || !row?.employeeId) return groups;

        if (!groups[row.date]) {
            groups[row.date] = [];
        }

        groups[row.date].push(row.employeeId);

        return groups;

    }, {});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
| An approval sheet rather than an attendance sheet: who worked the day, what
| the day was, and the whole decision trail beside it. A month of approvals
| that does not say who signed off what is a month payroll cannot stand on.
*/

export const APPROVAL_EXPORT_HEADER = [
    "Date",
    "Employee ID",
    "Employee Name",
    "Department",
    "Designation",
    "Punch In",
    "Punch Out",
    "Working Hours",
    "Attendance Status",
    "Approval",
    "Decided By",
    "Decided At",
    "Approval Remarks",
];

export const toApprovalExportRow = (record = {}) => [
    record.date,
    record.employeeId,
    record.employeeName,
    record.department,
    record.designation,
    formatTime(record.punchIn),
    formatTime(record.punchOut),
    record.workingHours || "--",
    record.status || "--",
    getApprovalLabel(record) || "--",
    record.approvedBy || "",
    record.approvedAt
        ? new Date(record.approvedAt).toLocaleString("en-IN")
        : "",
    record.approvalRemarks || "",
];
