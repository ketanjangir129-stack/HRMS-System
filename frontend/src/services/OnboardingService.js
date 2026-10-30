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

/*
| The batch goes up a few rows at a time rather than in one request, so the
| page can show how far it has got after every chunk instead of sitting on
| "0 of N" until the whole file is done. Each chunk is checked by the server
| against everything the chunks before it already wrote.
*/
const BULK_CHUNK_SIZE = 5;

const failedRows = (employees, message) =>
  employees.map((emp) => ({
    rowNumber: emp.rowNumber,
    employeeId: emp.employeeId,
    name: emp.name,
    email: emp.email,
    mobile: emp.mobile,
    success: false,
    message,
    invitationLink: "",
  }));

export const createBulkOnboardingRequests = async (
  companyCode,
  employees = [],
  onProgress,
  signal
) => {
  const total = employees.length;
  const results = [];

  for (let start = 0; start < total; start += BULK_CHUNK_SIZE) {
    const chunk = employees.slice(start, start + BULK_CHUNK_SIZE);

    try {
      const response = await createBulkOnboardingRequestsApi(chunk, signal);

      if (response?.success && Array.isArray(response.results)) {
        results.push(...response.results);
      } else {
        results.push(
          ...failedRows(chunk, response?.message || "Bulk onboarding request failed.")
        );
      }
    } catch (error) {
      // A cancelled run is the caller's decision, not a failure to report.
      if (error?.name === "AbortError") {
        throw error;
      }

      console.error("Error creating bulk onboarding requests:", error);
      results.push(
        ...failedRows(chunk, error.message || "Bulk onboarding request failed.")
      );
    }

    if (typeof onProgress === "function") {
      onProgress(Math.min(start + chunk.length, total), total);
    }
  }

  return results;
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