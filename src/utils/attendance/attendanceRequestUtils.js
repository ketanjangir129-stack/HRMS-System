import {
  APPROVER_ROLES,
  REQUEST_STATUS,
  REQUEST_TYPES,
} from "./attendanceConstants";
import {
  getLastCorrectableDate,
  toTimestamp,
} from "./attendanceDate";
import { searchRows } from "./attendanceTable";

/*
|--------------------------------------------------------------------------
| Attendance Request Utilities
|--------------------------------------------------------------------------
| Pure helpers for request permissions, validation, filtering and summaries.
| Kept free of Firebase logic so they can be reused across components, hooks
| and services.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Request Type Helpers
|--------------------------------------------------------------------------
*/

export const getRequestType = (value) =>
  REQUEST_TYPES.find((type) => type.value === value) || null;

/*
| Falls back to the raw value so records saved with an older type still render.
*/

export const getRequestTypeLabel = (value) =>
  getRequestType(value)?.label || value || "--";

/*
|--------------------------------------------------------------------------
| Roles & Permissions
|--------------------------------------------------------------------------
| Owners sign in through Firebase Auth and only have a role on the user
| object; employees and HR carry theirs on `account`.
*/

export const getUserRole = (currentUser) =>
  currentUser?.account?.role ||
  currentUser?.role ||
  "";

export const isApprover = (currentUser) =>
  APPROVER_ROLES.includes(getUserRole(currentUser));

export const getCurrentEmployeeId = (currentUser) =>
  currentUser?.employmentInfo?.employeeId || "";

export const isPending = (request) =>
  request?.status === REQUEST_STATUS.PENDING;

/*
| Only the employee who raised a still pending request can change it. HR sees
| every request but reviews them instead of editing them.
*/

export const canModifyRequest = (request, currentUser) =>
  isPending(request) &&
  request?.employeeId === getCurrentEmployeeId(currentUser);

export const canReviewRequest = (request, currentUser) =>
  isPending(request) && isApprover(currentUser);

/*
| A request can only be applied to an attendance record if it actually asks
| for a punch time.
*/

export const hasRequestedTimes = (request) =>
  Boolean(request?.requestedPunchIn || request?.requestedPunchOut);

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
| Returns a `{ field: message }` map so the modal can render errors inline.
*/

export const validateRequestForm = (form = {}) => {

  const errors = {};

  if (!form.employeeId?.trim()) {
    errors.employeeId = "Employee ID is required.";
  }

  if (!form.type) {
    errors.type = "Please select a request type.";
  }

  if (!form.date) {
    errors.date = "Please select a date.";
  } else if (form.date > getLastCorrectableDate()) {
    errors.date =
      "Attendance can only be corrected from the next day onwards.";
  }

  const requires = getRequestType(form.type)?.requires;

  if (requires === "punchIn" && !form.requestedPunchIn) {
    errors.requestedPunchIn = "Requested punch in time is required.";
  }

  if (requires === "punchOut" && !form.requestedPunchOut) {
    errors.requestedPunchOut = "Requested punch out time is required.";
  }

  if (requires === "both") {

    if (!form.requestedPunchIn) {
      errors.requestedPunchIn = "Requested punch in time is required.";
    }

    if (!form.requestedPunchOut) {
      errors.requestedPunchOut = "Requested punch out time is required.";
    }

  }

  if (
    requires === "any" &&
    !form.requestedPunchIn &&
    !form.requestedPunchOut
  ) {
    errors.requestedPunchIn =
      "Provide a punch in or a punch out time.";
  }

  if (
    form.requestedPunchIn &&
    form.requestedPunchOut &&
    form.requestedPunchOut <= form.requestedPunchIn
  ) {
    errors.requestedPunchOut =
      "Punch out time must be after punch in time.";
  }

  if (!form.reason?.trim()) {
    errors.reason = "Please provide a reason for this request.";
  } else if (form.reason.trim().length < 5) {
    errors.reason = "Please describe the reason in a few more words.";
  }

  return errors;

};

/*
|--------------------------------------------------------------------------
| Form State
|--------------------------------------------------------------------------
| Requests store the employee id only. Names and departments are resolved
| from the employees collection when they need to be displayed.
*/

export const getInitialRequestForm = (currentUser) => ({
  employeeId: getCurrentEmployeeId(currentUser),
  type: "",
  date: getLastCorrectableDate(),
  requestedPunchIn: "",
  requestedPunchOut: "",
  reason: "",
});

/*
| The stored request converted back into form values for editing.
*/

export const toRequestForm = (request = {}, toTimeValue) => ({
  employeeId: request.employeeId || "",
  type: request.type || "",
  date: request.date || getLastCorrectableDate(),
  requestedPunchIn: toTimeValue(request.requestedPunchIn),
  requestedPunchOut: toTimeValue(request.requestedPunchOut),
  reason: request.reason || "",
});

/*
| The form values converted into the payload that is stored.
*/

export const toRequestPayload = (form = {}) => ({
  employeeId: form.employeeId.trim().toUpperCase(),
  type: form.type,
  date: form.date,
  requestedPunchIn: toTimestamp(form.date, form.requestedPunchIn),
  requestedPunchOut: toTimestamp(form.date, form.requestedPunchOut),
  reason: form.reason.trim(),
});

/*
|--------------------------------------------------------------------------
| Filtering
|--------------------------------------------------------------------------
| Runs against requests already joined with the employee directory, so a
| search by name works without the request storing one.
*/

const SEARCH_FIELDS = [
  "employeeName",
  "employeeId",
  "requestId",
  "type",
  "department",
];

export const filterRequests = (
  requests = [],
  { search = "", status = "", type = "" } = {}
) =>
  searchRows(requests, search, SEARCH_FIELDS).filter((request) => {

    const matchesStatus = !status || request.status === status;

    const matchesType = !type || request.type === type;

    return matchesStatus && matchesType;

  });

/*
| Requests raised by the signed in employee, used for the "My Requests" view.
*/

export const filterOwnRequests = (requests = [], currentUser) => {

  const employeeId = getCurrentEmployeeId(currentUser);

  if (!employeeId) return [];

  return requests.filter(
    (request) => request.employeeId === employeeId
  );

};
