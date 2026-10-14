import { apiRequest } from "./apiClient";

const jsonRequest = (method, payload) => ({
  method,
  body: JSON.stringify(payload ?? {}),
});

// GET /api/statutory-compliance — full policy, defaults merged by the backend.
export const getStatutoryComplianceApi = () =>
  apiRequest("/statutory-compliance");

// PUT /api/statutory-compliance/:key — one policy at a time.
export const updatePFPolicyApi = (draft) =>
  apiRequest("/statutory-compliance/pf", jsonRequest("PUT", { draft }));

export const updateESIPolicyApi = (draft) =>
  apiRequest("/statutory-compliance/esi", jsonRequest("PUT", { draft }));

export const updateProfessionalTaxPolicyApi = (draft) =>
  apiRequest(
    "/statutory-compliance/professional-tax",
    jsonRequest("PUT", { draft })
  );

export const updateIncomeTaxPolicyApi = (draft) =>
  apiRequest(
    "/statutory-compliance/income-tax",
    jsonRequest("PUT", { draft })
  );

// POST /api/statutory-compliance/calculate — price earnings server-side.
export const calculateStatutoryDeductionsApi = (earnings, policy) =>
  apiRequest(
    "/statutory-compliance/calculate",
    jsonRequest("POST", { earnings, policy })
  );
