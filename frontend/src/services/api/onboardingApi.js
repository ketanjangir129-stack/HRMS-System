import { apiRequest } from "./apiClient";
import { API_URL } from "./apiConfig";

const jsonRequest = (method, payload) => ({
  method,
  body: JSON.stringify(payload ?? {}),
});

// ==========================================
// Public Candidate API (No auth token)
// ==========================================

export const getPublicOnboardingRequestApi = async (companyCode, employeeId) => {
  const url = `${API_URL}/onboarding/public/${encodeURIComponent(companyCode)}/${encodeURIComponent(employeeId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return await response.json();
};

export const submitPublicOnboardingFormApi = async (companyCode, employeeId, formData) => {
  const url = `${API_URL}/onboarding/public/${encodeURIComponent(companyCode)}/${encodeURIComponent(employeeId)}/submit`;

  const form = new FormData();
  const data = formData ?? {};

  // Text fields (File objects are appended below under their own field names)
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined || typeof value === "object") return;
    form.append(key, String(value));
  });

  // File uploads: aadhaarCard, panCard, resume, passportPhoto
  const files = data.files ?? {};
  Object.entries(files).forEach(([key, file]) => {
    if (file instanceof File) {
      form.append(key, file, file.name);
    }
  });

  // No Content-Type header — browser sets multipart/form-data with boundary
  const response = await fetch(url, {
    method: "POST",
    body: form,
  });
  return await response.json();
};

// ==========================================
// Protected HR/Admin API
// ==========================================

export const getOnboardingRequestsApi = () =>
  apiRequest("/onboarding/requests");

export const getOnboardingRequestByIdApi = (employeeId) =>
  apiRequest(`/onboarding/requests/${encodeURIComponent(employeeId)}`);

export const createOnboardingRequestApi = (employeeInfo) =>
  apiRequest(
    "/onboarding/single",
    jsonRequest("POST", {
      employeeInfo,
      origin: window.location.origin,
    })
  );

export const createBulkOnboardingRequestsApi = (employees) =>
  apiRequest(
    "/onboarding/bulk",
    jsonRequest("POST", {
      employees,
      origin: window.location.origin,
    })
  );

export const getIdentityIndexApi = () =>
  apiRequest("/onboarding/identity-index");

export const approveOnboardingApi = (employeeId) =>
  apiRequest(
    "/onboarding/approve",
    jsonRequest("POST", { employeeId })
  );

export const approveOnboardingBatchApi = (employeeIds) =>
  apiRequest(
    "/onboarding/approve-batch",
    jsonRequest("POST", { employeeIds })
  );

export const rejectOnboardingApi = (employeeId, remarks) =>
  apiRequest(
    "/onboarding/reject",
    jsonRequest("POST", { employeeId, remarks })
  );

export const rejectOnboardingBatchApi = (employeeIds, remarks) =>
  apiRequest(
    "/onboarding/reject-batch",
    jsonRequest("POST", { employeeIds, remarks })
  );

export const getOnboardingHistoryApi = () =>
  apiRequest("/onboarding/history");

export const stampInvitationEmailApi = (employeeId) =>
  apiRequest(
    "/onboarding/stamp-invitation-email",
    jsonRequest("POST", { employeeId })
  );

export const stampApprovalEmailApi = (employeeId) =>
  apiRequest(
    "/onboarding/stamp-approval-email",
    jsonRequest("POST", { employeeId })
  );
