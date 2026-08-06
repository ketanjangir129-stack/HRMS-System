/*
|--------------------------------------------------------------------------
| Leave Constants
|--------------------------------------------------------------------------
| Single source of truth for every value the leave module repeats: request
| types, statuses, the half day sessions and the calendar legend.
|
| Request statuses deliberately reuse the same three names as the attendance
| module (Pending / Approved / Rejected) so both modules can share one status
| badge and the colours never drift apart.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Request Types
|--------------------------------------------------------------------------
| `days` is the fixed duration of the type, or null when the length is
| derived from the selected date range.
*/

export const LEAVE_REQUEST_TYPE = {
  SINGLE_DAY: "Single Day",
  MULTIPLE_DAY: "Multiple Day",
  HALF_DAY: "Half Day",
};

export const LEAVE_REQUEST_TYPES = [
  {
    value: LEAVE_REQUEST_TYPE.SINGLE_DAY,
    label: "Single Day",
    description: "Leave for one full day",
    days: 1,
  },
  {
    value: LEAVE_REQUEST_TYPE.MULTIPLE_DAY,
    label: "Multiple Days",
    description: "Leave across a date range",
    days: null,
  },
  {
    value: LEAVE_REQUEST_TYPE.HALF_DAY,
    label: "Half Day",
    description: "Before or after lunch",
    days: 0.5,
  },
];

/*
|--------------------------------------------------------------------------
| Half Day Sessions
|--------------------------------------------------------------------------
*/

export const HALF_DAY_SESSION = {
  BEFORE_LUNCH: "Before Lunch",
  AFTER_LUNCH: "After Lunch",
};

export const HALF_DAY_SESSIONS = [
  HALF_DAY_SESSION.BEFORE_LUNCH,
  HALF_DAY_SESSION.AFTER_LUNCH,
];

/*
|--------------------------------------------------------------------------
| Request Status
|--------------------------------------------------------------------------
*/

export const LEAVE_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const LEAVE_STATUS_OPTIONS = [
  LEAVE_STATUS.PENDING,
  LEAVE_STATUS.APPROVED,
  LEAVE_STATUS.REJECTED,
];

/*
|--------------------------------------------------------------------------
| Calendar
|--------------------------------------------------------------------------
| Tile classes are the lower cased status, so a request maps straight onto a
| class without a second lookup table.
*/

export const LEAVE_CALENDAR_LEGEND = [
  { label: "Approved", color: "bg-emerald-500" },
  { label: "Pending", color: "bg-amber-500" },
  { label: "Rejected", color: "bg-red-500" },
];

/*
|--------------------------------------------------------------------------
| Tables
|--------------------------------------------------------------------------
*/

export const LEAVE_PAGE_SIZE = 8;

export const RECENT_LEAVE_REQUESTS = 5;
