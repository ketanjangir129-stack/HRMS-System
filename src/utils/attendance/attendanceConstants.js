/*
|--------------------------------------------------------------------------
| Attendance Constants
|--------------------------------------------------------------------------
| Single source of truth for every value the attendance module repeats:
| statuses, badge styles, request types, page sizes and the working day
| rules. Components import from here instead of re-declaring their own maps.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Attendance Status
|--------------------------------------------------------------------------
*/

export const ATTENDANCE_STATUS = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  LEAVE: "Leave",
  HALF_DAY: "Half Day",
  /*
  | A declared company holiday. Never stored on a record and never offered in
  | the manual attendance form: it is derived from the holiday calendar for a
  | day that has no record, so a day the office was closed is not reported as
  | an absence.
  */
  HOLIDAY: "Holiday",
  /*
  | A day the working week never covers, Sunday by default. Derived from
  | `WEEKLY_OFF_DAYS` the same way `HOLIDAY` is derived from the calendar, so
  | it is never stored on a record and never offered in the manual form: a day
  | nobody was expected in is not an absence and nobody has to mark it.
  */
  WEEKLY_OFF: "Weekly Off",
};

export const ATTENDANCE_STATUS_OPTIONS = [
  ATTENDANCE_STATUS.PRESENT,
  ATTENDANCE_STATUS.LATE,
  ATTENDANCE_STATUS.HALF_DAY,
  ATTENDANCE_STATUS.ABSENT,
  ATTENDANCE_STATUS.LEAVE,
];

export const STATUS_BADGES = {
  [ATTENDANCE_STATUS.PRESENT]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [ATTENDANCE_STATUS.LATE]: "bg-amber-50 text-amber-700 ring-amber-200",
  [ATTENDANCE_STATUS.ABSENT]: "bg-red-50 text-red-700 ring-red-200",
  [ATTENDANCE_STATUS.LEAVE]: "bg-blue-50 text-blue-700 ring-blue-200",
  [ATTENDANCE_STATUS.HALF_DAY]: "bg-purple-50 text-purple-700 ring-purple-200",
  [ATTENDANCE_STATUS.HOLIDAY]: "bg-teal-50 text-teal-700 ring-teal-200",
  [ATTENDANCE_STATUS.WEEKLY_OFF]: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export const STATUS_DOTS = {
  [ATTENDANCE_STATUS.PRESENT]: "bg-emerald-500",
  [ATTENDANCE_STATUS.LATE]: "bg-amber-500",
  [ATTENDANCE_STATUS.ABSENT]: "bg-red-500",
  [ATTENDANCE_STATUS.LEAVE]: "bg-blue-500",
  [ATTENDANCE_STATUS.HALF_DAY]: "bg-purple-500",
  [ATTENDANCE_STATUS.HOLIDAY]: "bg-teal-500",
  [ATTENDANCE_STATUS.WEEKLY_OFF]: "bg-indigo-500",
};

export const FALLBACK_BADGE = "bg-slate-100 text-slate-700 ring-slate-200";

export const FALLBACK_DOT = "bg-slate-500";

/*
|--------------------------------------------------------------------------
| Working Day Rules
|--------------------------------------------------------------------------
| A punch in later than `startTime` plus the grace period counts as Late, and
| `fullDayMinutes` is the working day used for the working hours progress bar.
*/

export const WORK_RULES = {
  startTime: "09:30",
  graceMinutes: 15,
  fullDayMinutes: 540,
};

/*
|--------------------------------------------------------------------------
| Daily Approval
|--------------------------------------------------------------------------
| Every day of attendance is signed off by HR or the owner before it counts.
| Until somebody has, the day is Pending: the punch happened, but nobody has
| confirmed it, so it is reported on its own instead of being counted as a
| day of attendance.
|
| The three values are the same as `REQUEST_STATUS` and this is deliberately
| not that constant. A correction request and a day of attendance are two
| different things that happen to share a vocabulary, and pointing one at the
| other would tie the two flows together the first time either of them needs
| a fourth state.
|--------------------------------------------------------------------------
*/

export const APPROVAL_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const APPROVAL_STATUS_OPTIONS = [
  APPROVAL_STATUS.PENDING,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
];

/*
|--------------------------------------------------------------------------
| Request Status
|--------------------------------------------------------------------------
*/

export const REQUEST_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const REQUEST_STATUS_BADGES = {
  [REQUEST_STATUS.PENDING]: "bg-amber-50 text-amber-700 ring-amber-200",
  [REQUEST_STATUS.APPROVED]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [REQUEST_STATUS.REJECTED]: "bg-red-50 text-red-700 ring-red-200",
};

export const REQUEST_STATUS_DOTS = {
  [REQUEST_STATUS.PENDING]: "bg-amber-500",
  [REQUEST_STATUS.APPROVED]: "bg-emerald-500",
  [REQUEST_STATUS.REJECTED]: "bg-red-500",
};

/*
|--------------------------------------------------------------------------
| Request Types
|--------------------------------------------------------------------------
| `requires` drives the form validation so the rules live with the type
| definition instead of being spread across the modal.
*/

export const REQUEST_TYPE = {
  CORRECTION: "Attendance Correction",
  LATE_CHECK_IN: "Late Check In",
  MISSED_CHECK_OUT: "Missed Check Out",
  WRONG_PUNCH_TIME: "Wrong Punch Time",
};

export const REQUEST_TYPES = [
  {
    value: REQUEST_TYPE.CORRECTION,
    label: "Attendance Correction",
    description: "Add or fix a full day of attendance",
    requires: "both",
  },
  {
    value: REQUEST_TYPE.LATE_CHECK_IN,
    label: "Late Check In",
    description: "Regularise a late punch in",
    requires: "punchIn",
  },
  {
    value: REQUEST_TYPE.MISSED_CHECK_OUT,
    label: "Missed Check Out",
    description: "Add a punch out that was never recorded",
    requires: "punchOut",
  },
  {
    value: REQUEST_TYPE.WRONG_PUNCH_TIME,
    label: "Wrong Punch Time",
    description: "Correct a punch in or punch out time",
    requires: "any",
  },
];

/*
|--------------------------------------------------------------------------
| Roles
|--------------------------------------------------------------------------
| Owners and HR review for the whole company. A manager reviews too, but only
| for the departments they have been given: the role is what unlocks the
| approve and reject buttons, and the department scope is what decides whose
| rows they appear on.
|
| The two questions are deliberately kept apart. `isApprover` below answers
| "may this role ever decide anything", which is a fact about the role and is
| the same on every screen. Whose records they may decide is a fact about the
| record, and is answered by `departmentScope` against the departments the
| manager owns. Folding the second into the first would mean every caller had
| to hold a record before it could render a button.
*/

export const ROLE = {
  OWNER: "owner",
  HR: "hr",
  MANAGER: "manager",
  EMPLOYEE: "employee",
};

export const APPROVER_ROLES = [ROLE.OWNER, ROLE.HR, ROLE.MANAGER];

/*
| The roles that review the whole company without being narrowed to anything.
| A manager is an approver but is not one of these, which is what every scope
| check below reads to decide whether it has to filter at all.
*/

export const UNSCOPED_APPROVER_ROLES = [ROLE.OWNER, ROLE.HR];

/*
|--------------------------------------------------------------------------
| Reports
|--------------------------------------------------------------------------
*/

export const REPORT_TYPE = {
  DAILY: "daily",
  MONTHLY: "monthly",
  EMPLOYEE: "employee",
  DEPARTMENT: "department",
};

export const REPORT_TABS = [
  {
    value: REPORT_TYPE.DAILY,
    label: "Daily Report",
    description: "Punch in and punch out for a single day",
  },
  {
    value: REPORT_TYPE.MONTHLY,
    label: "Monthly Report",
    description: "Month totals for every employee",
  },
  {
    value: REPORT_TYPE.EMPLOYEE,
    label: "Employee Report",
    description: "Day by day history of one employee",
  },
  {
    value: REPORT_TYPE.DEPARTMENT,
    label: "Department Report",
    description: "Attendance rolled up per department",
  },
];

/*
|--------------------------------------------------------------------------
| Tables
|--------------------------------------------------------------------------
*/

export const PAGE_SIZE = 8;

export const PAGE_SIZE_OPTIONS = [8, 15, 25, 50];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
