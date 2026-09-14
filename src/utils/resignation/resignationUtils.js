import {
  ACCEPTED_DOCUMENT_TYPES,
  DEFAULT_NOTICE_PERIOD_DAYS,
  EQUIPMENT_ITEMS,
  EQUIPMENT_STATUS,
  MAX_DOCUMENT_SIZE,
  MIN_REASON_LENGTH,
  RESIGNATION_STATUS,
  getStageIndex,
  isClosedStatus,
  isRejectedStatus,
} from "./resignationConstants";

import { ROLE } from "../attendance/attendanceConstants";

import {
  isDepartmentInScope,
  isOwnRow,
} from "../permissions/departmentScope";

/*
|--------------------------------------------------------------------------
| Resignation Utils
|--------------------------------------------------------------------------
| Pure, in the same sense `departmentScope` and `permissionUtils` are pure: a
| record goes in, an answer comes out, and nothing here reads Firebase or the
| signed in user.
|
| That is what lets the same functions decide a button on a card, a row in a
| queue and a guard inside the service. The screens ask before they draw and
| the service asks again before it writes, and because both are asking this
| file they cannot come to different conclusions.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Dates
|--------------------------------------------------------------------------
| Every date in the module is a `YYYY-MM-DD` key, the same shape attendance
| and leave use. A `Date` would carry a timezone the record has no business
| holding: a last working day is a calendar day, not a moment.
|--------------------------------------------------------------------------
*/

export const toDateKey = (value = new Date()) => {

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  /*
  | Built from the local parts rather than `toISOString`, which converts to
  | UTC first: for anybody east of Greenwich that turns an evening into the
  | next day, and a resignation filed at 9pm would be dated tomorrow.
  */
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;

};

export const parseDate = (value) => {

  if (!value) return null;

  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;

};

export const getToday = () => toDateKey();

/* A date key `days` from today, which is what the resignation form offers as
   the earliest last working day it will accept. */
export const addDays = (dateKey, days) => {

  const date = parseDate(dateKey);

  if (!date) return "";

  date.setDate(date.getDate() + Number(days || 0));

  return toDateKey(date);

};

/*
| Whole days from one key to the next, end inclusive - the notice period
| somebody actually served is counted the way a person counts it, so a
| resignation filed on the 1st with a last working day of the 30th is thirty
| days and not twenty nine.
*/
export const daysBetween = (fromKey, toKey) => {

  const from = parseDate(fromKey);

  const to = parseDate(toKey);

  if (!from || !to) return 0;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((to - from) / millisecondsPerDay) + 1;

};

export const formatDate = (value) => {

  const date = parseDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

};

export const formatDateTime = (timestamp) => {

  if (!timestamp) return "—";

  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

};

/*
| The last working day the form starts on: today plus the notice period. It
| is a suggestion and not a floor - somebody leaving on shorter notice is a
| normal thing that the settlement prices as a recovery rather than something
| the form should refuse to let them type.
*/

export const getSuggestedLastWorkingDay = (
  noticeDays = DEFAULT_NOTICE_PERIOD_DAYS
) => addDays(getToday(), noticeDays);

/*
|--------------------------------------------------------------------------
| The Employee On A Resignation
|--------------------------------------------------------------------------
| A resignation stores a snapshot of who raised it - name, id, department,
| designation, mobile, email - rather than only the employee id.
|
| That is deliberate duplication. The record has to stay readable after the
| employee has left, and once they have exited their directory entry is the
| one thing that is certain to change: a settled exit that renders as a blank
| row because the person it is about is no longer in `employees` is worse
| than a name that has gone slightly stale.
|--------------------------------------------------------------------------
*/

export const toEmployeeSnapshot = (employee, fallbackUser = null) => {

  const personal = employee?.personalInfo || {};

  const employment = employee?.employmentInfo || {};

  return {

    employeeId:
      String(
        employment.employeeId ||
        employee?.account?.username ||
        fallbackUser?.account?.username ||
        ""
      ).trim().toUpperCase(),

    name:
      personal.name ||
      employment.name ||
      fallbackUser?.name ||
      "",

    department: employment.department || "",

    designation: employment.designation || "",

    mobile:
      personal.mobile ||
      employment.mobile ||
      fallbackUser?.mobile ||
      "",

    email:
      personal.email ||
      employment.email ||
      fallbackUser?.email ||
      "",

    /*
    | Kept apart from `email` because the two are used at opposite ends of
    | the journey. The equipment form goes to the work address while they
    | still have it; the NOC goes here, precisely because by then they do
    | not.
    */
    personalEmail:
      personal.personalEmail ||
      personal.alternateEmail ||
      "",

    joiningDate: employment.joiningDate || "",

  };

};

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
| One function per form, each returning a `{ field: message }` object so the
| caller can put every problem beside the input that caused it instead of
| showing the first one in a toast.
|--------------------------------------------------------------------------
*/

export const validateResignation = (form = {}) => {

  const errors = {};

  if (!form.reasonCategory) {
    errors.reasonCategory = "Select a reason for leaving.";
  }

  const reason = String(form.reason || "").trim();

  if (!reason) {
    errors.reason = "Please describe your reason for resigning.";
  } else if (reason.length < MIN_REASON_LENGTH) {
    errors.reason = `Please write at least ${MIN_REASON_LENGTH} characters.`;
  }

  if (!form.lastWorkingDay) {
    errors.lastWorkingDay = "Choose your intended last working day.";
  } else if (form.lastWorkingDay < getToday()) {
    /*
    | A last working day in the past would mean the exit is already over
    | before anybody has approved it, and the settlement would be priced
    | against a month that has been paid.
    */
    errors.lastWorkingDay = "The last working day cannot be in the past.";
  }

  return errors;

};

/* The optional attachment on the resignation form. */
export const getDocumentError = (file) => {

  if (!file) return "";

  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
    return "Attach a PDF, JPG or PNG file.";
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return "The document must be smaller than 5 MB.";
  }

  return "";

};

/*
| The equipment form. Every item has to be answered - see the note on
| `EQUIPMENT_STATUS.NOT_ISSUED` for why a blank row is not allowed to stand
| in for "I never had one".
|
| An item marked returned also has to say which one, because a settlement
| that recovers the cost of an unreturned laptop needs to know which laptop
| was returned and which was not.
*/

export const validateEquipment = (items = {}) => {

  const errors = {};

  EQUIPMENT_ITEMS.forEach((item) => {

    const entry = items[item.key] || {};

    if (!entry.status) {
      errors[item.key] = "Say what happened to this item.";
      return;
    }

    if (
      entry.status === EQUIPMENT_STATUS.RETURNED &&
      !String(entry.identifier || "").trim()
    ) {
      errors[item.key] = `Enter the ${item.identifierLabel.toLowerCase()}.`;
    }

  });

  return errors;

};

/* A settlement can be zero, but it cannot be negative or unreadable. */
export const validateFnF = (values = {}) => {

  const errors = {};

  Object.entries(values).forEach(([name, value]) => {

    const amount = Number(value);

    if (value === "" || value === null || value === undefined) return;

    if (Number.isNaN(amount)) {
      errors[name] = "Enter a number.";
    } else if (amount < 0) {
      errors[name] = "Cannot be negative.";
    }

  });

  return errors;

};

export const hasErrors = (errors = {}) =>
  Object.values(errors).some(Boolean);

/*
|--------------------------------------------------------------------------
| Equipment Helpers
|--------------------------------------------------------------------------
*/

/* A blank equipment declaration, one row per item. */
export const getEmptyEquipment = () =>
  EQUIPMENT_ITEMS.reduce((items, item) => {

    items[item.key] = {
      status: "",
      identifier: "",
      remarks: "",
    };

    return items;

  }, {});

/*
| The items still outstanding. HR reads this on the settlement screen: an
| unreturned laptop is what an Asset Recovery line is usually for, so the
| worksheet names them rather than leaving HR to open the equipment tab and
| compare by hand.
*/

export const getOutstandingEquipment = (items = {}) =>
  EQUIPMENT_ITEMS.filter(
    (item) => items?.[item.key]?.status === EQUIPMENT_STATUS.PENDING
  );

/*
|--------------------------------------------------------------------------
| Who May Act
|--------------------------------------------------------------------------
| Each step of the journey belongs to somebody, and these are the questions
| every screen and every service write asks before it does anything.
|
| The role is checked here as well as the stage, so a caller can hand a
| record straight to one of these instead of pairing it with a role test of
| its own and letting the two drift.
|
| `scope` is the object `useManagerScope` publishes. It is optional - HR and
| the owner are never narrowed by it - but a manager without it is refused,
| because "no scope" must never widen into "every department".
|--------------------------------------------------------------------------
*/

export const isOwnResignation = (resignation, employeeId) =>
  Boolean(employeeId) &&
  String(resignation?.employeeId ?? "").trim().toUpperCase() ===
    String(employeeId).trim().toUpperCase();

/*
| The manager's step. Only the manager of the department the employee is in,
| only while it is waiting on them, and never their own resignation - a
| manager resigning is HR's decision, exactly as a manager's own leave is.
*/

export const canManagerReview = (resignation, role, scope) => {

  if (resignation?.status !== RESIGNATION_STATUS.MANAGER_PENDING) {
    return false;
  }

  if (role === ROLE.OWNER || role === ROLE.HR) return true;

  if (role !== ROLE.MANAGER) return false;

  if (isOwnRow(scope, resignation)) return false;

  return isDepartmentInScope(scope, resignation?.department);

};

/*
| HR's step. Not narrowed by department: HR reviews the whole company, which
| is the rule `departmentScope` states for every module.
*/

export const canHrReview = (resignation, role) =>
  resignation?.status === RESIGNATION_STATUS.HR_PENDING &&
  (role === ROLE.OWNER || role === ROLE.HR);

/* Only the employee themselves declares what they are holding. */
export const canSubmitEquipment = (resignation, employeeId) =>
  resignation?.status === RESIGNATION_STATUS.EQUIPMENT_PENDING &&
  isOwnResignation(resignation, employeeId);

/* HR prices the settlement, and may re-price it while it is under review. */
export const canPrepareFnF = (resignation, role) =>
  [
    RESIGNATION_STATUS.FNF_PENDING,
    RESIGNATION_STATUS.FNF_REVIEW,
  ].includes(resignation?.status) &&
  (role === ROLE.OWNER || role === ROLE.HR);

export const canReviewFnF = (resignation, role) =>
  resignation?.status === RESIGNATION_STATUS.FNF_REVIEW &&
  (role === ROLE.OWNER || role === ROLE.HR);

/*
| The last step. Unlike every other check here this one takes a permission
| rather than a role: the finance sign-off is a switch the owner hands out in
| Roles & Access, the same way `payroll.approve` and `payroll.lock` are, so
| asking "which role is this" would answer the wrong question.
*/

export const canApproveFinance = (resignation, canFinanceApprove) =>
  resignation?.status === RESIGNATION_STATUS.FINANCE_PENDING &&
  Boolean(canFinanceApprove);

/*
| Whether the signed in user may open this record at all. Wider than any of
| the decisions above: an employee reads their own exit from the first day to
| the last without ever being able to decide a step of it, and a manager
| reads the exits of their departments after they have passed on.
*/

export const canViewResignation = (resignation, { role, employeeId, scope }) => {

  if (!resignation) return false;

  if (role === ROLE.OWNER || role === ROLE.HR) return true;

  if (isOwnResignation(resignation, employeeId)) return true;

  if (role === ROLE.MANAGER) {
    return isDepartmentInScope(scope, resignation?.department);
  }

  return false;

};

/*
| The rows a queue shows. The same narrowing `filterRowsInScope` applies to
| leave and attendance, plus the employee case: somebody with no approval
| rights at all still sees their own.
*/

export const filterVisibleResignations = (
  resignations = [],
  { role, employeeId, scope }
) =>
  resignations.filter((resignation) =>
    canViewResignation(resignation, { role, employeeId, scope })
  );

/*
| The rows waiting on this particular user, which is what the queue counts in
| its "needs you" tab. A resignation is pending for somebody at every stage,
| but it is only pending for *you* at the stage you own.
*/

export const isAwaitingUser = (
  resignation,
  { role, employeeId, scope, canFinanceApprove }
) =>
  canManagerReview(resignation, role, scope) ||
  canHrReview(resignation, role) ||
  canSubmitEquipment(resignation, employeeId) ||
  canPrepareFnF(resignation, role) ||
  canReviewFnF(resignation, role) ||
  canApproveFinance(resignation, canFinanceApprove);

/*
|--------------------------------------------------------------------------
| Reading A Record
|--------------------------------------------------------------------------
*/

export const isActiveResignation = (resignation) =>
  Boolean(resignation) && !isClosedStatus(resignation.status);

/*
| An employee has at most one resignation in flight. Raising a second while
| the first is still moving is what this answers, and the resignation button
| on the profile reads it to decide between "Resign" and "View Exit Status".
|
| A rejected or completed one does not block a new one: somebody whose
| resignation was turned down may raise another, and the alternative is an
| employee permanently unable to resign because of a decision made a year
| ago.
*/

export const getActiveResignation = (resignations = []) =>
  resignations.find(isActiveResignation) || null;

/*
| Newest first. The id sorts by time already - it is built from a push key -
| but `raisedAt` is what the list is actually ordered by, because that is the
| field the screens show.
*/

export const sortByNewest = (resignations = []) =>
  [...resignations].sort(
    (a, b) => (b?.raisedAt || 0) - (a?.raisedAt || 0)
  );

/*
| The counts the dashboard cards show. Walked once rather than filtered six
| times, so a company with a long exit history does not pay for six passes to
| draw six numbers.
*/

export const getResignationSummary = (resignations = []) =>
  resignations.reduce(
    (summary, resignation) => {

      summary.total += 1;

      if (isRejectedStatus(resignation?.status)) {
        summary.rejected += 1;
      } else if (resignation?.status === RESIGNATION_STATUS.EXITED) {
        summary.exited += 1;
      } else {
        summary.inProgress += 1;

        if (
          getStageIndex(resignation?.status) >=
          getStageIndex(RESIGNATION_STATUS.EQUIPMENT_PENDING)
        ) {
          summary.inSettlement += 1;
        } else {
          summary.awaitingApproval += 1;
        }
      }

      return summary;

    },
    {
      total: 0,
      inProgress: 0,
      awaitingApproval: 0,
      inSettlement: 0,
      exited: 0,
      rejected: 0,
    }
  );

/*
| Search across the fields somebody would actually type: the name, the id,
| the department and the designation. The same shape `searchEmployees` uses,
| so the resignation queue filters the way the directory does.
*/

export const searchResignations = (resignations = [], term = "") => {

  const query = String(term).trim().toLowerCase();

  if (!query) return resignations;

  return resignations.filter((resignation) =>
    [
      resignation?.name,
      resignation?.employeeId,
      resignation?.department,
      resignation?.designation,
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query))
  );

};
