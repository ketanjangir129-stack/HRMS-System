import { apiRequest } from "./apiClient";

const jsonRequest = (method, payload) => ({
  method,
  body: JSON.stringify(payload ?? {}),
});

export const getReimbursementClaimsApi = () =>
  apiRequest("/reimbursement/claims");

export const getReimbursementClaimApi = (claimId) =>
  apiRequest(`/reimbursement/claims/${encodeURIComponent(claimId)}`);

export const createReimbursementClaimApi = (payload) =>
  apiRequest("/reimbursement/claims", jsonRequest("POST", payload));

export const approveReimbursementClaimApi = (claimId, remarks = "") =>
  apiRequest(
    `/reimbursement/claims/${encodeURIComponent(claimId)}/approve`,
    jsonRequest("PATCH", { remarks })
  );

export const rejectReimbursementClaimApi = (claimId, reason) =>
  apiRequest(
    `/reimbursement/claims/${encodeURIComponent(claimId)}/reject`,
    jsonRequest("PATCH", { reason })
  );

export const getReimbursementSummaryApi = () =>
  apiRequest("/reimbursement/summary");

export const uploadReceiptApi = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "reimbursements/receipts");
  formData.append("resourceType", "image");
  return apiRequest("/upload/file", { method: "POST", body: formData });
};
