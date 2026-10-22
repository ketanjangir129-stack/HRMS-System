import { apiRequest } from "./apiClient";

/**
 * POST /api/salary/create
 * Assign a new salary structure for an employee.
 * The backend calculates statutory deductions (PF, ESI, Professional Tax, Income Tax)
 * from the stored compliance policy. Only `loan` and `other` deductions come from the client.
 */
export const createSalaryApi = async (salaryData) => {
  return await apiRequest("/salary/create", {
    method: "POST",
    body: JSON.stringify(salaryData),
  });
};

/**
 * GET /api/salary/:employeeId
 * Fetch a single employee's salary structure.
 */
export const getSalaryApi = async (employeeId) => {
  return await apiRequest(`/salary/${encodeURIComponent(employeeId)}`);
};

/**
 * GET /api/salary/list
 * Fetch all salary structures for the company. Company comes from the
 * auth token, so no query param is needed.
 */
export const getAllSalariesApi = async () => {
  return await apiRequest("/salary/list");
};

/**
 * PATCH /api/salary/:employeeId
 * Revise an existing salary structure. The backend recalculates statutory
 * deductions from the current policy and archives the previous structure
 * to salary history.
 */
export const updateSalaryApi = async (employeeId, salaryData) => {
  return await apiRequest(`/salary/${encodeURIComponent(employeeId)}`, {
    method: "PATCH",
    body: JSON.stringify(salaryData),
  });
};

/**
 * DELETE /api/salary/:employeeId
 * Remove a salary structure.
 */
export const deleteSalaryApi = async (employeeId) => {
  return await apiRequest(`/salary/${encodeURIComponent(employeeId)}`, {
    method: "DELETE",
  });
};

/**
 * GET /api/salary/revisions
 * Fetch all salary revisions company-wide, newest first. Each revision
 * pairs an archived structure (previous) with the structure it produced
 * (current), plus employee details.
 */
export const getSalaryRevisionsApi = async () => {
  return await apiRequest("/salary/revisions");
};

/**
 * GET /api/salary/revisions/:employeeId
 * Fetch salary revisions for one employee, newest first.
 */
export const getSalaryRevisionByIdApi = async (employeeId) => {
  return await apiRequest(
    `/salary/revisions/${encodeURIComponent(employeeId)}`
  );
};

/**
 * GET /api/salary/export?employeeIds=...
 * Fetch salary records for export. Returns the same record shape as the
 * list read — the Excel file itself is still built on the frontend, so
 * its columns never change.
 */
export const exportSalariesApi = async (employeeIds = []) => {
  const query =
    Array.isArray(employeeIds) && employeeIds.length
      ? `?employeeIds=${encodeURIComponent(employeeIds.join(","))}`
      : "";
  return await apiRequest(`/salary/export${query}`);
};

/**
 * POST /api/salary/import
 * Bulk import salary structures. Rows are pre-parsed by the caller, so
 * Excel, CSV and any other file format all arrive as the same row shape:
 * { employeeId, earnings, deductions, effectiveFrom, status }.
 * Client-side totals are ignored — the backend reprices everything.
 */
export const importSalariesApi = async (rows, options = {}) => {
  const { updateExisting = false, updatedBy = null } = options;
  return await apiRequest("/salary/import", {
    method: "POST",
    body: JSON.stringify({ rows, updateExisting, updatedBy }),
  });
};