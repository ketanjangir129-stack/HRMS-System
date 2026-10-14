
import { apiRequest } from "./apiClient";

const jsonRequest = (method, payload) => ({
  method,
  body: JSON.stringify(payload ?? {}),
});

export const getLeaveRequestsApi = () =>
  apiRequest("/leave/requests");

export const createLeaveRequestApi = (payload) =>
  apiRequest("/leave/requests", jsonRequest("POST", payload));

export const updateLeaveRequestApi = (requestId, payload) =>
  apiRequest(
    `/leave/requests/${encodeURIComponent(requestId)}`,
    jsonRequest("PATCH", payload)
  );

export const deleteLeaveRequestApi = (requestId) =>
  apiRequest(
    `/leave/requests/${encodeURIComponent(requestId)}`,
    { method: "DELETE" }
  );

export const approveLeaveRequestApi = (requestId, remarks = "", approver = "") =>
  apiRequest(
    `/leave/requests/${encodeURIComponent(requestId)}/approve`,
    jsonRequest("PATCH", { remarks, approver })
  );

export const rejectLeaveRequestApi = (requestId, remarks, approver = "") =>
  apiRequest(
    `/leave/requests/${encodeURIComponent(requestId)}/reject`,
    jsonRequest("PATCH", { remarks, approver })
  );

export const getLeaveSettingsApi = () =>
  apiRequest("/leave/settings");

export const updateLeaveSettingsApi = (payload) =>
  apiRequest("/leave/settings", jsonRequest("PATCH", payload));

export const getLeaveUsageApi = (year, employeeId) => {
  const employeePath = employeeId
    ? `/${encodeURIComponent(employeeId)}`
    : "";

  return apiRequest(
    `/leave/usage/${encodeURIComponent(year)}${employeePath}`
  );
};
