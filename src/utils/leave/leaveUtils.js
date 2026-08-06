import { ATTENDANCE_STATUS } from "../attendance/attendanceConstants";
import { getDateKey } from "../attendance/attendanceDate";
import { searchRows } from "../attendance/attendanceTable";
import {
  getWorkingDayBreakdown,
  isNonWorkingDay,
} from "../holiday/holidayUtils";
import {
  HALF_DAY_SESSION,
  LEAVE_REQUEST_TYPE,
  LEAVE_STATUS,
} from "./leaveConstants";

/*
|--------------------------------------------------------------------------
| Leave Utilities
|--------------------------------------------------------------------------
| Pure helpers for the leave module: balance maths, duration maths, request
| validation, calendar mapping and list filtering.
|
| Nothing here touches Firebase, so the same functions run in the dashboard,
| the apply modal, the history table and the HR approval page.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
| Leave dates are stored as the `YYYY-MM-DD` value produced by
| `<input type="date">`. `new Date("2026-08-05")` parses that as UTC midnight,
| which lands on the previous day in negative offsets, so the parts are read
| and rebuilt as a local date instead.
*/

export const parseLeaveDate = (value) => {

  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const [year, month, day] = String(value)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);

};

/*
| Whole days between two `YYYY-MM-DD` values, both ends included.
|
| The difference is taken from the calendar parts rather than the millisecond
| gap: across a daylight saving change a "day" is 23 or 25 hours long and a
| millisecond division rounds the range down by one.
*/

const countDaysInclusive = (fromDate, toDate) => {

  const start = parseLeaveDate(fromDate);
  const end = parseLeaveDate(toDate);

  if (!start || !end) return 0;

  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endDay = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  if (endDay < startDay) return 0;

  return (
    Math.round(
      (endDay - startDay) / (1000 * 60 * 60 * 24)
    ) + 1
  );

};

/*
|--------------------------------------------------------------------------
| Calculate Leave Balance
|--------------------------------------------------------------------------
| Leaves accrue month by month, so in the running year only the months that
| have already started are earned. A past or future year is shown with the
| full annual allocation.
|
| `pendingDays` is the total of the requests that are still awaiting review.
| They have not been deducted from `used` yet, so without subtracting them an
| employee could keep applying against a balance that is already spoken for.
*/

export const calculateLeaveBalance = (
  settings,
  usage,
  year,
  pendingDays = 0
) => {

  const today = new Date();

  const currentYear = today.getFullYear();

  let earned = settings.annualLeaves;

  if (year === currentYear) {

    earned = Math.min(
      settings.annualLeaves,
      (today.getMonth() + 1) *
        settings.monthlyAccrual
    );

  }

  /*
  | Carry forward is capped by the company settings, so a balance written by
  | an earlier rollover can never exceed the limit that is configured today.
  */

  const carryForward =
    settings.allowCarryForward === false
      ? 0
      : Math.min(
          usage.carryForward || 0,
          settings.maxCarryForward ?? Infinity
        );

  const used =
    usage.used || 0;

  const lwp =
    usage.lwp || 0;

  const remaining =
    earned +
    carryForward -
    used;

  return {

    annualLeave:
      settings.annualLeaves,

    earned,

    carryForward,

    used,

    remaining,

    lwp,

    pending: pendingDays,

    /*
    | What may actually be applied for right now: the remaining balance minus
    | everything already waiting for approval.
    */
    available: Math.max(
      0,
      remaining - pendingDays
    ),

  };

};

/*
|--------------------------------------------------------------------------
| Calculate Leave Days
|--------------------------------------------------------------------------
| What a request actually costs the employee's balance.
|
| `holidayDates` are the days the company has declared closed. They are not
| charged, and neither are the weekly offs: a range that runs from a Friday
| to the following Monday over a Saturday holiday and a Sunday costs two
| days, not four. Leaving them in would spend leave on days the office was
| shut anyway.
|
| Omitting the argument keeps the plain calendar count, so any caller that
| has not loaded the holiday calendar behaves exactly as it did before.
*/

export const calculateLeaveDays = ({
  requestType,
  fromDate,
  toDate,
  durationType,
  holidayDates = null,
}) => {

  if (!fromDate) return 0;

  const skipsNonWorkingDays = holidayDates !== null;

  // Half Day
  if (
    requestType === LEAVE_REQUEST_TYPE.HALF_DAY ||
    durationType === LEAVE_REQUEST_TYPE.HALF_DAY
  ) {

    /*
    | Half of a day that is not worked is still nothing, so a half day on a
    | holiday costs zero and is refused by the validation below.
    */
    if (
      skipsNonWorkingDays &&
      isNonWorkingDay(fromDate, holidayDates)
    ) {
      return 0;
    }

    return 0.5;

  }

  // Single Day
  if (requestType === LEAVE_REQUEST_TYPE.SINGLE_DAY) {

    if (
      skipsNonWorkingDays &&
      isNonWorkingDay(fromDate, holidayDates)
    ) {
      return 0;
    }

    return 1;

  }

  // Multiple Days
  if (!toDate) return 0;

  if (!skipsNonWorkingDays) {
    return countDaysInclusive(fromDate, toDate);
  }

  return getWorkingDayBreakdown(
    fromDate,
    toDate,
    holidayDates
  ).workingDays.length;

};

/*
| The same range, described rather than counted: how many calendar days it
| covers, which of them are holidays and which are weekly offs.
|
| The apply modal shows it so an employee can see why five days off cost
| three, instead of being told a number that looks wrong.
*/

export const getLeaveDaysBreakdown = ({
  requestType,
  fromDate,
  toDate,
  holidayDates = [],
}) => {

  if (!fromDate) {
    return {
      totalDays: 0,
      workingDays: [],
      holidayDays: [],
      weeklyOffDays: [],
      skippedDays: 0,
    };
  }

  const end =
    requestType === LEAVE_REQUEST_TYPE.MULTIPLE_DAY
      ? toDate || fromDate
      : fromDate;

  return getWorkingDayBreakdown(
    fromDate,
    end,
    holidayDates
  );

};

/*
|--------------------------------------------------------------------------
| Validate Leave Request
|--------------------------------------------------------------------------
| Returns the first problem as a message, or null when the request is valid.
*/

export const validateLeaveRequest = ({
  requestType,
  fromDate,
  toDate,
  durationType,
  halfDaySession,
  reason,
  availableBalance,
  holidayDates = null,
}) => {

  if (!requestType) {
    return "Please select request type.";
  }

  if (!fromDate) {
    return "Please select leave date.";
  }

  if (
    requestType === LEAVE_REQUEST_TYPE.MULTIPLE_DAY &&
    !toDate
  ) {
    return "Please select end date.";
  }

  if (
    requestType === LEAVE_REQUEST_TYPE.MULTIPLE_DAY &&
    countDaysInclusive(fromDate, toDate) === 0
  ) {
    return "End date cannot be before start date.";
  }

  if (
    durationType === LEAVE_REQUEST_TYPE.HALF_DAY &&
    !halfDaySession
  ) {
    return "Please select half day session.";
  }

  if (
    !reason ||
    reason.trim().length < 10
  ) {
    return "Reason should contain at least 10 characters.";
  }

  const days =
    calculateLeaveDays({
      requestType,
      fromDate,
      toDate,
      durationType,
      holidayDates,
    });

  /*
  | A duration of zero has two different causes once holidays are applied, so
  | they are reported separately: an empty range is a mistake in the dates,
  | while a range made entirely of holidays is simply nothing to apply for.
  */
  if (days <= 0) {

    if (holidayDates === null) {
      return "Invalid leave duration.";
    }

    if (requestType === LEAVE_REQUEST_TYPE.MULTIPLE_DAY) {
      return "The selected range has no working days. Holidays and weekly offs do not need a leave request.";
    }

    return "The selected date is a holiday or a weekly off. No leave is needed for it.";

  }

  if (days > availableBalance) {
    return "Insufficient leave balance.";
  }

  return null;

};

/*
|--------------------------------------------------------------------------
| Calculate Remaining Balance
|--------------------------------------------------------------------------
*/

export const calculateRemainingBalance = (
  available,
  days
) => {

  return Math.max(
    0,
    available - days
  );

};

/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

export const formatLeaveDuration = (
  days
) => {

  if (!days) {
    return "--";
  }

  if (days === 0.5) {
    return "Half Day";
  }

  if (days === 1) {
    return "1 Day";
  }

  return `${days} Days`;

};

/*
| "05 Aug 2026" for a single day and "05 Aug 2026 - 09 Aug 2026" for a range.
*/

export const formatLeaveDate = (value) => {

  const date = parseLeaveDate(value);

  if (!date) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

};

export const formatLeaveRange = (request = {}) => {

  const from = formatLeaveDate(request.fromDate);

  if (
    !request.toDate ||
    request.toDate === request.fromDate
  ) {
    return from;
  }

  return `${from} - ${formatLeaveDate(request.toDate)}`;

};

/*
| The label shown next to the duration: a half day also states the session.
*/

export const formatLeaveType = (request = {}) => {

  if (request.requestType !== LEAVE_REQUEST_TYPE.HALF_DAY) {
    return request.requestType || "--";
  }

  return `Half Day · ${request.halfDaySession || HALF_DAY_SESSION.BEFORE_LUNCH}`;

};

/*
|--------------------------------------------------------------------------
| Request Helpers
|--------------------------------------------------------------------------
*/

export const isPendingLeave = (request) =>
  request?.status === LEAVE_STATUS.PENDING;

export const isApprovedLeave = (request) =>
  request?.status === LEAVE_STATUS.APPROVED;

/*
| A request belongs to the year it starts in, which is the year its days are
| booked against in the usage tree.
*/

export const getLeaveRequestYear = (request) =>
  parseLeaveDate(request?.fromDate)?.getFullYear() || null;

export const filterLeaveRequestsByYear = (
  requests = [],
  year
) =>
  requests.filter(
    (request) => getLeaveRequestYear(request) === year
  );

export const filterOwnLeaveRequests = (
  requests = [],
  employeeId
) => {

  if (!employeeId) return [];

  return requests.filter(
    (request) => request.employeeId === employeeId
  );

};

/*
| Only the employee who raised a still pending request may withdraw it. Once
| it has been reviewed it is a record and stays in the history.
*/

export const canDeleteLeaveRequest = (
  request,
  employeeId
) =>
  isPendingLeave(request) &&
  request?.employeeId === employeeId;

/*
|--------------------------------------------------------------------------
| Pending Days
|--------------------------------------------------------------------------
| The days locked up by requests that are still awaiting review, used to keep
| the applied balance honest before an approval ever happens.
*/

export const getPendingLeaveDays = (requests = []) =>
  requests
    .filter(isPendingLeave)
    .reduce(
      (total, request) => total + (Number(request.days) || 0),
      0
    );

/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
| The counts the HR approval page shows above the list.
*/

export const getLeaveRequestSummary = (requests = []) => {

  const summary = {
    total: requests.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    pendingDays: 0,
    approvedDays: 0,
  };

  requests.forEach((request) => {

    const days = Number(request.days) || 0;

    if (request.status === LEAVE_STATUS.PENDING) {
      summary.pending += 1;
      summary.pendingDays += days;
      return;
    }

    if (request.status === LEAVE_STATUS.APPROVED) {
      summary.approved += 1;
      summary.approvedDays += days;
      return;
    }

    if (request.status === LEAVE_STATUS.REJECTED) {
      summary.rejected += 1;
    }

  });

  return summary;

};

/*
|--------------------------------------------------------------------------
| Filtering
|--------------------------------------------------------------------------
| Runs against requests already joined with the employee directory, so a
| search by name works even though the request only stores the employee id.
*/

const SEARCH_FIELDS = [
  "employeeName",
  "employeeId",
  "requestId",
  "requestType",
  "department",
  "reason",
];

export const filterLeaveRequests = (
  requests = [],
  { search = "", status = "", requestType = "" } = {}
) =>
  searchRows(requests, search, SEARCH_FIELDS).filter((request) => {

    const matchesStatus =
      !status || request.status === status;

    const matchesType =
      !requestType || request.requestType === requestType;

    return matchesStatus && matchesType;

  });

/*
|--------------------------------------------------------------------------
| Calendar
|--------------------------------------------------------------------------
| Every date a request covers, so a multi day range highlights each of its
| days and not only the day it starts on.
*/

export const getLeaveDateKeys = (request = {}) => {

  const start = parseLeaveDate(request.fromDate);

  if (!start) return [];

  const end =
    parseLeaveDate(request.toDate) || start;

  const keys = [];

  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  /*
  | Guarded against a stored range with the dates the wrong way round, which
  | would otherwise never reach the end date and loop forever.
  */
  while (cursor <= end && keys.length < 366) {

    keys.push(getDateKey(cursor));

    cursor.setDate(cursor.getDate() + 1);

  }

  return keys;

};

/*
| The days of a request that are actually charged as leave, which is what
| gets written onto the attendance sheet when it is approved.
|
| A holiday inside a range is not leave: the office was closed, the balance
| was not charged for it, and marking the day "Leave" would report a day off
| twice over.
|
| Releasing still uses `getLeaveDateKeys`, the full calendar range. Clearing
| only touches days carrying the request's own id, so passing the wider set
| is safe and repairs a range booked before the holiday calendar changed.
*/

export const getLeaveWorkingDateKeys = (
  request = {},
  holidayDates = []
) =>
  getLeaveDateKeys(request).filter(
    (dateKey) => !isNonWorkingDay(dateKey, holidayDates)
  );

/*
| A `{ "YYYY-MM-DD": "approved" }` map for the calendar tiles.
|
| Approved days win over pending ones on the same date, so a decided day is
| never drawn as if it were still waiting.
*/

const STATUS_PRIORITY = {
  [LEAVE_STATUS.APPROVED]: 3,
  [LEAVE_STATUS.PENDING]: 2,
  [LEAVE_STATUS.REJECTED]: 1,
};

export const getLeaveCalendarMap = (requests = []) => {

  const calendar = {};

  requests.forEach((request) => {

    const status = request?.status;

    if (!status) return;

    getLeaveDateKeys(request).forEach((dateKey) => {

      const current = calendar[dateKey];

      const isHigher =
        !current ||
        (STATUS_PRIORITY[status] || 0) >
          (STATUS_PRIORITY[current.status] || 0);

      if (isHigher) {

        const isHalfDay =
          request.requestType === LEAVE_REQUEST_TYPE.HALF_DAY;

        calendar[dateKey] = {
          status,
          request,
          className: `${String(status).toLowerCase()}${isHalfDay ? " half-day" : ""}`,
        };

      }

    });

  });

  return calendar;

};

/*
|--------------------------------------------------------------------------
| Attendance Bridge
|--------------------------------------------------------------------------
| An approved leave is a day of attendance, so a request has to be readable as
| one. These are the only two places the two modules agree on a shape, and
| both sides import them rather than deciding for themselves what an approved
| leave looks like on the attendance sheet.
|
| A half day is still half a working day: it maps onto Half Day, and the
| employee is still expected to punch for the session they work. Anything
| longer maps onto Leave, which is a day that is not worked at all.
*/

export const getLeaveAttendanceStatus = (request = {}) =>
  request.requestType === LEAVE_REQUEST_TYPE.HALF_DAY
    ? ATTENDANCE_STATUS.HALF_DAY
    : ATTENDANCE_STATUS.LEAVE;

/*
| The remark the attendance record carries, so a day marked from the leave
| module says why it is not a normal working day.
*/

export const getLeaveAttendanceRemarks = (request = {}) => {

  if (request.requestType !== LEAVE_REQUEST_TYPE.HALF_DAY) {
    return "Approved leave";
  }

  return `Approved half day leave · ${
    request.halfDaySession || HALF_DAY_SESSION.BEFORE_LUNCH
  }`;

};
