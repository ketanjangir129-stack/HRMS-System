import { db } from "../../firebase/firebase";
import { ref, onValue } from "firebase/database";
import { getMonthPath, getMonthNode } from "../../utils/attendance/attendanceDate";
import { APPROVAL_STATUS } from "../../utils/attendance/attendanceConstants";
import {
  getMonthlyAttendanceApi,
  getDailyAttendanceApi,
  getEmployeeAttendanceApi,
  punchInAttendanceApi,
  punchOutAttendanceApi,
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
const monthRef = (companyCode, year, month) =>
  ref(db, `${recordsPath(companyCode)}/${getMonthNode(year, month)}`);

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

export const subscribeToEmployeeAttendanceHistory = (
  companyCode, employeeId, year, month, onData, onError
) => onValue(
  monthRef(companyCode, year, month),
  (snapshot) => {
    const history = [];
    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach((employees) => {
        if (employees?.[employeeId]) history.push(employees[employeeId]);
      });
    }
    history.sort((a, b) => a.date.localeCompare(b.date));
    onData(history);
  },
  onError
);

// Keep the established signatures for callers. Identity and approver fields
// are intentionally omitted from the request and derived by the backend.
export const punchInEmployee = async (_companyCode, employeeId, location = null) => {
  if (!employeeId) return { success: false, message: "Employee account not found." };
  return punchInAttendanceApi({ employeeId, location });
};

export const punchOutEmployee = async (_companyCode, employeeId, location = null, date = "") => {
  if (!employeeId) return { success: false, message: "Employee account not found." };
  return punchOutAttendanceApi({ employeeId, location, date });
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
