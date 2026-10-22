import {
  getReimbursementClaimsApi,
  createReimbursementClaimApi,
  approveReimbursementClaimApi,
  rejectReimbursementClaimApi,
  getReimbursementSummaryApi,
} from "../api/reimbursementApi";

export const getReimbursementClaims = async () => {
  const result = await getReimbursementClaimsApi();
  if (!result || result.success === false) {
    throw new Error(result?.message || "Failed to load reimbursement claims.");
  }
  return Array.isArray(result.claims) ? result.claims : [];
};

export const createReimbursementClaim = async (payload) => {
  try {
    const result = await createReimbursementClaimApi(payload);
    if (!result || result.success === false) {
      return { success: false, message: result?.message || "Failed to submit claim." };
    }
    return { success: true, claimId: result.claimId, claim: result.claim };
  } catch (error) {
    return { success: false, message: error.message || "Failed to submit claim." };
  }
};

export const approveReimbursementClaim = async (claim, remarks = "") => {
  const claimId = claim?.claimId;
  if (!claimId) return { success: false, message: "Claim ID is missing." };
  try {
    const result = await approveReimbursementClaimApi(claimId, remarks);
    if (!result || result.success === false) {
      return { success: false, message: result?.message || "Failed to approve claim." };
    }
    return { success: true, claim: result.claim };
  } catch (error) {
    return { success: false, message: error.message || "Failed to approve claim." };
  }
};

export const rejectReimbursementClaim = async (claim, reason) => {
  const claimId = claim?.claimId;
  if (!claimId) return { success: false, message: "Claim ID is missing." };
  if (!String(reason || "").trim()) {
    return { success: false, message: "A rejection reason is required." };
  }
  try {
    const result = await rejectReimbursementClaimApi(claimId, String(reason).trim());
    if (!result || result.success === false) {
      return { success: false, message: result?.message || "Failed to reject claim." };
    }
    return { success: true, claim: result.claim };
  } catch (error) {
    return { success: false, message: error.message || "Failed to reject claim." };
  }
};

export const getReimbursementSummary = async () => {
  const result = await getReimbursementSummaryApi();
  if (!result || result.success === false) {
    throw new Error(result?.message || "Failed to load reimbursement summary.");
  }
  return result.summary;
};
