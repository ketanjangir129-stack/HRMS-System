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

const mutateAttendanceWithImage = async (endpoint, payload, image) => {
  const formData = new FormData();

  formData.append("image", image, "attendance.jpg");

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(
        key,
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
      );
    }
  });

  try {
    return await apiRequest(endpoint, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    // fetch() rejects on network failure; a non-JSON reply fails in .json().
    console.error("Attendance upload failed:", error);
    return {
      success: false,
      message: navigator.onLine
        ? "Could not reach the server. Please try again."
        : "You are offline. Check your connection and try again.",
    };
  }
};

export const punchInAttendanceApi = (payload, image) =>
  mutateAttendanceWithImage("/attendance/punch-in", payload, image);

export const punchOutAttendanceApi = (payload, image) =>
  mutateAttendanceWithImage("/attendance/punch-out", payload, image);

export const retakePunchPhotoApi = (payload, image) =>
  mutateAttendanceWithImage("/attendance/photo", payload, image);


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
