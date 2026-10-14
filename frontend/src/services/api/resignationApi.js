import { apiRequest } from "./apiClient";
import { RESIGNATION_STATUS } from "../../utils/resignation/resignationConstants";

/*
| The backend stores status as a code ("MANAGER_PENDING") - the key of
| RESIGNATION_STATUS - while every screen compares against the label
| ("Manager Approval Pending"). Translate once here, as records come in.
| A value that is already a label (older records) passes through unchanged.
*/

const toClientStatus = (status) => RESIGNATION_STATUS[status] ?? status;

// "APPROVED" / "REJECTED" -> "Approved" / "Rejected", as the detail modal reads.
const toClientReview = (review) =>
  review && typeof review.decision === "string"
    ? {
        ...review,
        decision:
          review.decision.charAt(0).toUpperCase() +
          review.decision.slice(1).toLowerCase(),
      }
    : review;

const toClientResignation = (record) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return record;
  }

  return {
    ...record,
    status: toClientStatus(record.status),
    managerReview: toClientReview(record.managerReview),
    hrReview: toClientReview(record.hrReview),
  };
};

/*
| `apiRequest` resolves with the backend's JSON envelope even on 4xx/5xx -
| `{ success: false, code, message }` - rather than throwing. Mutations pass
| that envelope back so the caller can show its message; reads must not, or
| an error envelope is mistaken for a resignation or an empty list.
*/

const resignationsUrl = (companyCode) =>
  `/companies/${encodeURIComponent(companyCode)}/resignations`;

const resignationUrl = (companyCode, resignationId, suffix = "") =>
  `${resignationsUrl(companyCode)}/${encodeURIComponent(resignationId)}${suffix}`;

const requireIds = (companyCode, resignationId) => {
  if (!companyCode || !resignationId) {
    throw new Error("Company code and resignation ID are required.");
  }
};

const isFailure = (response) =>
  !response || typeof response !== "object" || response.success === false;

const toError = (response, fallback) => {
  const error = new Error(response?.message || fallback);
  error.code = response?.code;
  return error;
};

// Normalize backend envelope { data } to the { resignation } shape callers read.
const normalizeResignationResponse = (response, resignationId) => {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    const raw = response.resignation ?? response.data ?? null;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const resignation = toClientResignation(raw);
      return {
        ...response,
        success: response.success ?? true,
        data: resignation,
        resignation,
        resignationId: resignation.resignationId ?? resignationId,
      };
    }
  }

  return response;
};

const patchResignation = async (companyCode, resignationId, suffix, body) => {
  requireIds(companyCode, resignationId);

  const response = await apiRequest(
    resignationUrl(companyCode, resignationId, suffix),
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );

  return normalizeResignationResponse(response, resignationId);
};

export const ResignationcreateApi = async (
  companyCode,
  {
    employee,
    reasonCategory,
    reason,
    lastWorkingDay,
    noticePeriodDays,
  }
) => {
  if (!companyCode) {
    throw new Error("Company code is required.");
  }

  try {
    const response = await apiRequest(resignationsUrl(companyCode), {
      method: "POST",
      body: JSON.stringify({
        employee,
        reasonCategory,
        reason,
        lastWorkingDay,
        noticePeriodDays,
      }),
    });

    return normalizeResignationResponse(response);
  } catch (error) {
    console.error("Create resignation API error:", error);
    throw error;
  }
};

export const getResignationsApi = async (companyCode) => {
  if (!companyCode) return [];

  const response = await apiRequest(resignationsUrl(companyCode), {
    method: "GET",
  });

  // Throw rather than return the envelope: an empty list here would hide the
  // error and let createResignation's duplicate check pass.
  if (isFailure(response)) {
    throw toError(response, "Unable to load resignations.");
  }

  const records = Array.isArray(response)
    ? response
    : (response.data ?? response.resignations ?? []);

  return Array.isArray(records) ? records.map(toClientResignation) : [];
};

export const getResignationByIdApi = async (companyCode, resignationId) => {
  if (!companyCode || !resignationId) return null;

  const response = await apiRequest(
    resignationUrl(companyCode, resignationId),
    {
      method: "GET",
    }
  );

  if (isFailure(response)) {
    if (response?.code === "RESIGNATION_NOT_FOUND") return null;
    throw toError(response, "Unable to load this resignation.");
  }

  return normalizeResignationResponse(response, resignationId);
};

export const approveByManagerApi = async (
  companyCode,
  resignationId,
  remarks = "",
  lastWorkingDay = null
) => {
  // 3rd arg may be an options object { remarks, lastWorkingDay }.
  let finalRemarks = remarks;
  let finalLastWorkingDay = lastWorkingDay;
  if (remarks && typeof remarks === "object") {
    finalRemarks = remarks.remarks ?? remarks.note ?? "";
    finalLastWorkingDay = remarks.lastWorkingDay ?? lastWorkingDay ?? null;
  }

  return patchResignation(companyCode, resignationId, "/manager/approve", {
    remarks: finalRemarks,
    ...(finalLastWorkingDay ? { lastWorkingDay: finalLastWorkingDay } : {}),
  });
};

export const rejectByManagerApi = (companyCode, resignationId, reason) =>
  patchResignation(companyCode, resignationId, "/manager/reject", { reason });

export const approveByHrApi = (
  companyCode,
  resignationId,
  { lastWorkingDay, remarks = "" } = {}
) =>
  patchResignation(companyCode, resignationId, "/hr/approve", {
    lastWorkingDay,
    remarks,
  });

export const rejectByHrApi = (companyCode, resignationId, reason) =>
  patchResignation(companyCode, resignationId, "/hr/reject", { reason });

export const submitEquipmentApi = (
  companyCode,
  resignationId,
  { equipment, items, remarks = "" } = {}
) =>
  patchResignation(companyCode, resignationId, "/equipment", {
    equipment: equipment ?? items,
    remarks,
  });

export const attachDocumentApi = (companyCode, resignationId, documentUrl) =>
  patchResignation(companyCode, resignationId, "/document", { documentUrl });

export const saveFnFApi = (
  companyCode,
  resignationId,
  { values, notes = "", derivation = null, totals } = {}
) =>
  patchResignation(companyCode, resignationId, "/fnf", {
    fnf: { values, notes, derivation, ...(totals !== undefined ? { totals } : {}) },
  });

export const submitFnFForReviewApi = async (companyCode, resignationId) => {
  requireIds(companyCode, resignationId);

  const response = await apiRequest(
    resignationUrl(companyCode, resignationId, "/fnf/submit"),
    {
      method: "POST",
    }
  );

  return normalizeResignationResponse(response, resignationId);
};

export const reviewFnFApi = (
  companyCode,
  resignationId,
  { remarks = "" } = {}
) =>
  patchResignation(companyCode, resignationId, "/fnf/review", { remarks });

export const returnFnFApi = (companyCode, resignationId, reason) =>
  patchResignation(companyCode, resignationId, "/fnf/return", { reason });

export const financeApproveApi = (
  companyCode,
  resignationId,
  { remarks = "" } = {}
) =>
  patchResignation(companyCode, resignationId, "/finance/approve", { remarks });
