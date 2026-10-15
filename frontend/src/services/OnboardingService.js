import {
  getPublicOnboardingRequestApi,
  submitPublicOnboardingFormApi,
  getOnboardingRequestsApi,
  getOnboardingRequestByIdApi,
  createOnboardingRequestApi,
  createBulkOnboardingRequestsApi,
  getOnboardingHistoryApi,
  stampInvitationEmailApi,
} from "./api/onboardingApi";

/*
|--------------------------------------------------------------------------
| Onboarding Service
|--------------------------------------------------------------------------
| Frontend orchestration service routing onboarding operations through
| the backend REST API endpoints.
|--------------------------------------------------------------------------
*/

export const buildInvitationLink = (companyCode, employeeId) =>
  `${window.location.origin}/onboarding/${companyCode}/${employeeId}`;

export const createOnboardingRequest = async (companyCode, employeeInfo) => {
  try {
    const response = await createOnboardingRequestApi(employeeInfo);
    return response;
  } catch (error) {
    console.error("Error creating onboarding request:", error);
    return {
      success: false,
      message: error.message || "Failed to create onboarding request.",
    };
  }
};

export const createBulkOnboardingRequests = async (
  companyCode,
  employees = [],
  onProgress
) => {
  try {
    const response = await createBulkOnboardingRequestsApi(employees);
    const results = response?.results || [];

    if (typeof onProgress === "function") {
      onProgress(results.length, employees.length);
    }

    return results;
  } catch (error) {
    console.error("Error creating bulk onboarding requests:", error);
    return employees.map((emp) => ({
      rowNumber: emp.rowNumber,
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email,
      mobile: emp.mobile,
      success: false,
      message: error.message || "Bulk onboarding request failed.",
      invitationLink: "",
    }));
  }
};

export const markInvitationEmailSent = async (companyCode, employeeId) => {
  if (!companyCode || !employeeId) {
    return false;
  }
  try {
    const response = await stampInvitationEmailApi(employeeId);
    return Boolean(response?.success);
  } catch (error) {
    console.error(`Could not stamp invitation email for ${employeeId}:`, error);
    return false;
  }
};

export const getOnboardingHistory = async (companyCode) => {
  try {
    const response = await getOnboardingHistoryApi();
    return response?.history || [];
  } catch (error) {
    console.error("Error loading onboarding history:", error);
    return [];
  }
};

export const getOnboardingRequests = async (companyCode) => {
  try {
    const response = await getOnboardingRequestsApi();
    return response?.requests || [];
  } catch (error) {
    console.error("Error fetching onboarding requests:", error);
    return [];
  }
};

export const getOnboardingRequestById = async (companyCode, requestId) => {
  try {
    // If logged in as HR, read through the authenticated API first
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const response = await getOnboardingRequestByIdApi(requestId);
        if (response?.request) {
          return response.request;
        }
      } catch (err) {
        // Fall back to public endpoint
      }
    }

    // Candidate form or fallback
    const publicResponse = await getPublicOnboardingRequestApi(companyCode, requestId);
    return publicResponse?.request || null;
  } catch (error) {
    console.error("Error fetching onboarding request by ID:", error);
    return null;
  }
};

export const submitOnboardingForm = async (companyCode, employeeId, formData) => {
  try {
    const response = await submitPublicOnboardingFormApi(companyCode, employeeId, formData);
    return response;
  } catch (error) {
    console.error("Error submitting onboarding form:", error);
    return {
      success: false,
      message: error.message || "Failed to submit onboarding form.",
    };
  }
};