import {
  normalizeStatutoryCompliance,
} from "../../utils/statutoryCompliance/statutoryComplianceConstants";
import {
  calculateStatutoryDeductionsApi,
  getStatutoryComplianceApi,
  updateESIPolicyApi,
  updateIncomeTaxPolicyApi,
  updatePFPolicyApi,
  updateProfessionalTaxPolicyApi,
} from "../api/statutoryComplianceApi";

/*
|--------------------------------------------------------------------------
| Statutory Compliance Service
|--------------------------------------------------------------------------
| Thin client over the backend API. Company scope comes from the auth token,
| so `companyCode` is kept in the signatures for compatibility with existing
| callers but is not sent — the backend derives it from the session.
|
| companies/{companyCode}/settings/statutoryCompliance/{pf|esi|...}
| lives behind the API now; nothing here touches Firebase directly.
|
| Reads never write. A company that has never opened the Statutory Compliance
| screen gets the defaults merged by the backend.
|
| PF, ESI, Professional Tax and Income Tax are written separately, each behind
| its own Save button, because they are policies that happen to share a
| screen - saving one should not commit half-finished edits to another.
|--------------------------------------------------------------------------
*/

const describeError = (error, fallback) => {
  const code = String(error?.code || error?.message || "").toLowerCase();

  if (code.includes("permission_denied") || code.includes("permission")) {
    return "You do not have permission to manage statutory compliance policies.";
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    code.includes("disconnected") ||
    code.includes("fetch") ||
    code.includes("failed to fetch")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  return fallback;
};

/*
|--------------------------------------------------------------------------
| Get Statutory Compliance
|--------------------------------------------------------------------------
| The full policy, already merged over the defaults, so a caller never has to
| ask whether a company has configured anything.
*/

export const getStatutoryCompliance = async (_companyCode) => {
  let result;

  try {
    result = await getStatutoryComplianceApi();
  } catch (error) {
    throw new Error(
      describeError(error, "Failed to load statutory compliance policies."),
      { cause: error }
    );
  }

  if (!result?.success) {
    throw new Error(
      result?.message || "Failed to load statutory compliance policies."
    );
  }

  return normalizeStatutoryCompliance(result.data);
};

// Legacy alias: HR Policy was renamed to Statutory Compliance.
export const getHRPolicy = getStatutoryCompliance;

/*
|--------------------------------------------------------------------------
| Save
|--------------------------------------------------------------------------
| One policy at a time. Validation failures come back as
| `{ success: false, message, errors }` so the form can show the field error;
| anything else throws for the toast.
*/

const savePolicy = async ({ draft, api, fallbackMessage }) => {
  let result;

  try {
    result = await api(draft);
  } catch (error) {
    throw new Error(describeError(error, fallbackMessage), { cause: error });
  }

  if (!result?.success) {
    if (result?.errors) {
      return {
        success: false,
        message: result.message || fallbackMessage,
        errors: result.errors,
      };
    }

    throw new Error(result?.message || fallbackMessage);
  }

  // Backend answers `{ data: { [key]: policy }, policy }` — accept either.
  const policy =
    result.policy ?? Object.values(result.data || {})[0] ?? result.data;

  return { success: true, policy };
};

export const updatePFPolicy = (_companyCode, draft) =>
  savePolicy({
    draft,
    api: updatePFPolicyApi,
    fallbackMessage: "Failed to save the PF policy. Please try again.",
  });

export const updateESIPolicy = (_companyCode, draft) =>
  savePolicy({
    draft,
    api: updateESIPolicyApi,
    fallbackMessage: "Failed to save the ESI policy. Please try again.",
  });

export const updateProfessionalTaxPolicy = (_companyCode, draft) =>
  savePolicy({
    draft,
    api: updateProfessionalTaxPolicyApi,
    fallbackMessage:
      "Failed to save the Professional Tax policy. Please try again.",
  });

export const updateIncomeTaxPolicy = (_companyCode, draft) =>
  savePolicy({
    draft,
    api: updateIncomeTaxPolicyApi,
    fallbackMessage: "Failed to save the Income Tax policy. Please try again.",
  });

/*
|--------------------------------------------------------------------------
| Calculate
|--------------------------------------------------------------------------
| Price earnings against the stored policy without a second read. The salary
| screens keep their local calculator for instant feedback; this is the
| server-side check the backend guarantees with the same rules.
*/

export const calculateDeductions = async (earnings, policy) => {
  let result;

  try {
    result = await calculateStatutoryDeductionsApi(earnings, policy);
  } catch (error) {
    throw new Error(
      describeError(error, "Failed to calculate statutory deductions."),
      { cause: error }
    );
  }

  if (!result?.success) {
    throw new Error(
      result?.message || "Failed to calculate statutory deductions."
    );
  }

  return result.data;
};
