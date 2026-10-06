import { apiRequest } from "./apiClient";

export const getMonthlyAttendanceApi = async (year, month) => {
  return await apiRequest(
    `/attendance/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`
  );
};


export const getDailyAttendanceApi = async (date) => {
  return await apiRequest(
    `/attendance/daily?date=${encodeURIComponent(date)}`
  );
};

export const getEmployeeAttendanceApi = async (
  employeeId,
  year,
  month
) => {
  return await apiRequest(
    `/attendance/employee/${encodeURIComponent(
      employeeId
    )}?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`
  );
};

const mutateAttendance = async (endpoint, method, payload) => {
    return apiRequest(endpoint, {
      method,
      body: JSON.stringify(payload || {}),
    });
};

export const punchInAttendanceApi = (payload) =>
  mutateAttendance("/attendance/punch-in", "POST", payload);
export const punchOutAttendanceApi = (payload) =>
  mutateAttendance("/attendance/punch-out", "POST", payload);
export const saveManualAttendanceApi = (payload) =>
  mutateAttendance("/attendance/manual", "POST", payload);
export const updateAttendanceCorrectionApi = (payload) =>
  mutateAttendance("/attendance/correction", "PATCH", payload);
export const setAttendanceApprovalApi = (payload) =>
  mutateAttendance("/attendance/approval", "PATCH", payload);
export const approveAttendanceDayApi = (payload) =>
  mutateAttendance("/attendance/approval/bulk", "PATCH", payload);
export const applyLeaveAttendanceApi = (payload) =>
  mutateAttendance("/attendance/leave/sync", "POST", payload);
export const clearLeaveAttendanceApi = (payload) =>
  mutateAttendance("/attendance/leave/sync", "DELETE", payload);
