import { getUserRole } from "../utils/attendance/attendanceRequestUtils";
import { OWNER_ROLE } from "../utils/permissions/permissionConstants";
import { isOwnerRole } from "../utils/permissions/permissionUtils";
import {
  approveOnboardingApi,
  approveOnboardingBatchApi,
  rejectOnboardingApi,
  rejectOnboardingBatchApi,
  stampApprovalEmailApi,
} from "./api/onboardingApi";

/*
|--------------------------------------------------------------------------
| Approval Service
|--------------------------------------------------------------------------
| Frontend orchestration service routing onboarding approval and rejection
| through the backend REST API endpoints.
|--------------------------------------------------------------------------
*/

export const getApproverId = (currentUser) =>
  isOwnerRole(getUserRole(currentUser))
    ? OWNER_ROLE
    : currentUser?.employmentInfo?.employeeId ||
      currentUser?.account?.username ||
      "";

export const approveOnboarding = async (
  companyCode,
  employeeId,
  approvedBy
) => {
  try {
    const response = await approveOnboardingApi(employeeId);
    return response;
  } catch (error) {
    console.error("Error approving onboarding request:", error);
    return {
      success: false,
      message: error.message || "Failed to approve onboarding.",
    };
  }
};

export const approveOnboardingRequests = async (
  companyCode,
  employeeIds = [],
  approvedBy
) => {
  try {
    const response = await approveOnboardingBatchApi(employeeIds);
    return {
      approved: response.approved || [],
      failed: response.failed || [],
    };
  } catch (error) {
    console.error("Error in bulk approve onboarding requests:", error);
    return {
      approved: [],
      failed: employeeIds.map((id) => ({
        employeeId: id,
        message: error.message || "Failed to approve request.",
      })),
    };
  }
};

export const markApprovalEmailSent = async (companyCode, employeeId) => {
  if (!companyCode || !employeeId) {
    return false;
  }
  try {
    const response = await stampApprovalEmailApi(employeeId);
    return Boolean(response?.success);
  } catch (error) {
    console.error("Could not stamp approval email as sent:", error);
    return false;
  }
};

export const rejectOnboarding = async (
  companyCode,
  employeeId,
  remarks,
  rejectedBy
) => {
  try {
    const response = await rejectOnboardingApi(employeeId, remarks);
    return response;
  } catch (error) {
    console.error("Error rejecting onboarding request:", error);
    return {
      success: false,
      message: error.message || "Failed to reject onboarding request.",
    };
  }
};

export const rejectOnboardingRequests = async (
  companyCode,
  employeeIds = [],
  remarks,
  rejectedBy
) => {
  try {
    const response = await rejectOnboardingBatchApi(employeeIds, remarks);
    return {
      rejected: response.rejected || [],
      failed: response.failed || [],
    };
  } catch (error) {
    console.error("Error in bulk reject onboarding requests:", error);
    return {
      rejected: [],
      failed: employeeIds.map((id) => ({
        employeeId: id,
        message: error.message || "Failed to reject request.",
      })),
    };
  }
};
