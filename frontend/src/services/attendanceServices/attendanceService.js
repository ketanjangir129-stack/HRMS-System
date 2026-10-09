import { db } from "../../firebase/firebase";
import { ref, onValue } from "firebase/database";
import { getMonthPath, getMonthDateKeys } from "../../utils/attendance/attendanceDate";
import { APPROVAL_STATUS } from "../../utils/attendance/attendanceConstants";
import {
  getMonthlyAttendanceApi,
  getDailyAttendanceApi,
  getEmployeeAttendanceApi,
  punchInAttendanceApi,
  punchOutAttendanceApi,
  retakePunchPhotoApi,
  saveManualAttendanceApi,
  updateAttendanceCorrectionApi,
  setAttendanceApprovalApi,
  approveAttendanceDayApi,
  applyLeaveAttendanceApi,
  clearLeaveAttendanceApi,
} from "../api/attendanceApi";

const recordsPath = (companyCode) => `companies/${companyCode}/attendance/records`;
const dayPath = (date, employeeId) => `${getMonthPath(date)}/${date}/${employeeId}`;
const recordPath = (companyCode, date, employeeId) =>
  `${recordsPath(companyCode)}/${dayPath(date, employeeId)}`;

// Non-realtime reads and every attendance mutation use the authenticated API.
export const getMonthlyAttendanceRecords = async (companyCode, year, month) => {
  try {
    const result = await getMonthlyAttendanceApi(year, month);
    if (!result?.success) throw new Error(result?.message || "Failed to fetch monthly attendance.");
    return result?.data?.records || {};
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again.", { cause: error });
  }
};

export const getDailyAttendanceRecords = async (date) => {
  const result = await getDailyAttendanceApi(date);
  if (!result?.success) throw new Error(result?.message || "Failed to fetch daily attendance.");
  return result?.data?.records || {};
};

export const getEmployeeAttendanceRecords = async (employeeId, year, month) => {
  const result = await getEmployeeAttendanceApi(employeeId, year, month);
  if (!result?.success) throw new Error(result?.message || "Failed to fetch employee attendance.");
  return result?.data?.records || {};
};

/* Realtime attendance reads intentionally remain on Firebase for this task. */
export const subscribeToDailyAttendance = (companyCode, date, onData, onError) =>
  onValue(
    ref(db, `${recordsPath(companyCode)}/${getMonthPath(date)}/${date}`),
    (snapshot) => onData(snapshot.exists() ? Object.values(snapshot.val()) : []),
    onError
  );

export const subscribeToEmployeeDay = (companyCode, employeeId, date, onData, onError) =>
  onValue(
    ref(db, recordPath(companyCode, date, employeeId)),
    (snapshot) => onData(snapshot.exists() ? snapshot.val() : null),
    onError
  );

/*
 * Only the listed fields of one employee's day, e.g. ["punchIn",
 * "images/punchIn/url"]. Location, approval and audit data on the same record
 * are never downloaded. Emits a nested object once every field has answered
 * (null when none exist), then on each change.
 */
export const subscribeToEmployeeDayFields = (
  companyCode, employeeId, date, fields, onData, onError
) => {
  const base = recordPath(companyCode, date, employeeId);
  const pending = new Set(fields);
  const values = {};
  let failed = false;

  const emit = () => {
    if (failed || pending.size) return;

    const present = fields.filter((field) => values[field] != null);
    if (!present.length) {
      onData(null);
      return;
    }

    const record = {};
    present.forEach((field) => {
      const parts = field.split("/");
      let node = record;
      parts.slice(0, -1).forEach((part) => {
        node[part] ??= {};
        node = node[part];
      });
      node[parts.at(-1)] = values[field];
    });
    onData(record);
  };

  const unsubscribers = fields.map((field) =>
    onValue(
      ref(db, `${base}/${field}`),
      (snapshot) => {
        pending.delete(field);
        values[field] = snapshot.exists() ? snapshot.val() : null;
        emit();
      },
      (error) => {
        if (failed) return;
        failed = true;
        onError?.(error);
      }
    )
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

/*
 * One employee's month. The month node holds EVERY employee's records, so
 * instead of downloading it this listens to `{date}/{employeeId}` for each day.
 * Firebase multiplexes the listeners over one socket, and only this
 * employee's (small) records ever cross the wire. Data is emitted once every
 * day has answered, then on each change.
 */
export const subscribeToEmployeeAttendanceHistory = (
  companyCode, employeeId, year, month, onData, onError
) => {
  const dates = getMonthDateKeys(year, month);
  const pending = new Set(dates);
  const records = new Map();
  let failed = false;

  const emit = () => {
    if (failed || pending.size) return;
    onData(
      [...records.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, record]) => ({ ...record, date: record.date || date }))
    );
  };

  const unsubscribers = dates.map((date) =>
    onValue(
      ref(db, recordPath(companyCode, date, employeeId)),
      (snapshot) => {
        pending.delete(date);
        if (snapshot.exists()) records.set(date, snapshot.val());
        else records.delete(date);
        emit();
      },
      (error) => {
        if (failed) return;
        failed = true;
        onError?.(error);
      }
    )
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

// Keep the established signatures for callers. Identity and approver fields
// are intentionally omitted from the request and derived by the backend.
// export const punchInEmployee = async (_companyCode, employeeId, location = null) => {
//   if (!employeeId) return { success: false, message: "Employee account not found." };
//   return punchInAttendanceApi({ employeeId, location });
// };

// export const punchOutEmployee = async (_companyCode, employeeId, location = null, date = "") => {
//   if (!employeeId) return { success: false, message: "Employee account not found." };
//   return punchOutAttendanceApi({ employeeId, location, date });
// };

export const punchInEmployee = async (
  _companyCode,
  employeeId,
  location = null,
  image
) => {
  if (!employeeId) {
    return { success: false, message: "Employee account not found." };
  }

  if (!image) {
    return { success: false, message: "Please capture an attendance photo." };
  }

  return punchInAttendanceApi({ employeeId, location }, image);
};

export const punchOutEmployee = async (
  _companyCode,
  employeeId,
  location = null,
  date = "",
  image
) => {
  if (!employeeId) {
    return { success: false, message: "Employee account not found." };
  }

  if (!image) {
    return { success: false, message: "Please capture an attendance photo." };
  }

  return punchOutAttendanceApi({ employeeId, location, date }, image);
};

// type: "in" | "out". Replaces today's photo only; the punch time is kept.
export const retakePunchPhoto = async (employeeId, type, image) => {
  if (!employeeId) {
    return { success: false, message: "Employee account not found." };
  }

  if (!image) {
    return { success: false, message: "Please capture an attendance photo." };
  }

  return retakePunchPhotoApi({ employeeId, type }, image);
};



export const saveAttendance = async (_companyCode, attendance, _approvedBy = "") =>
  saveManualAttendanceApi(attendance);

export const updateAttendanceRecord = async (_companyCode, request, _approvedBy = "") =>
  updateAttendanceCorrectionApi(request);

export const applyLeaveAttendance = async (_companyCode, {
  employeeId, dateKeys = [], status, remarks = "", leaveRequestId = "",
}) => applyLeaveAttendanceApi({ employeeId, dateKeys, status, remarks, leaveRequestId });

export const clearLeaveAttendance = async (_companyCode, {
  employeeId, dateKeys = [], leaveRequestId = "",
}) => clearLeaveAttendanceApi({ employeeId, dateKeys, leaveRequestId });

export const setAttendanceApproval = async (_companyCode, {
  date, employeeId, status, remarks = "",
}) => {
  if (status === APPROVAL_STATUS.PENDING) {
    return { success: false, message: "A day can only be approved or rejected." };
  }
  return setAttendanceApprovalApi({ date, employeeId, status, remarks });
};

export const approveAttendanceDay = async (_companyCode, date, employeeIds = []) => {
  if (!employeeIds.length) return { success: true, approved: 0 };
  const result = await approveAttendanceDayApi({ date, employeeIds });
  return { success: result?.success, approved: result?.data?.approved || 0, message: result?.message };
};
