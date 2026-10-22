import { apiRequest } from "./apiClient";

/**
 * GET /api/payroll/runs/:month
 * Fetch a month's run record (totals + generate/approve/lock state).
 */
export const getPayrollRunApi = async (payrollMonth) => {
  return await apiRequest(
    `/payroll/runs/${encodeURIComponent(payrollMonth)}`
  );
};

/**
 * GET /api/payroll/records/:month
 * Fetch every payroll record of a month, keyed by employee ID.
 */
export const getMonthlyPayrollApi = async (payrollMonth) => {
  return await apiRequest(
    `/payroll/records/${encodeURIComponent(payrollMonth)}`
  );
};

/**
 * GET /api/payroll/status/:month
 * Dashboard list: every employee with their month state, plus the run.
 */
export const getEmployeesWithPayrollStatusApi = async (payrollMonth) => {
  return await apiRequest(
    `/payroll/status/${encodeURIComponent(payrollMonth)}`
  );
};

/**
 * GET /api/payroll/employee/:employeeId/months?months=...
 * One employee's payroll across the given months, each with its run.
 */
export const getEmployeePayrollMonthsApi = async (employeeId, months = []) => {
  const query =
    Array.isArray(months) && months.length
      ? `?months=${encodeURIComponent(months.join(","))}`
      : "";
  return await apiRequest(
    `/payroll/employee/${encodeURIComponent(employeeId)}/months${query}`
  );
};

/**
 * GET /api/payroll/employee/:employeeId/history
 * Payslip-page spelling: recent months ending at the anchor month.
 */
export const getPayrollHistoryApi = async (employeeId, anchorMonth, count) => {
  const params = new URLSearchParams();
  if (anchorMonth) params.set("anchorMonth", anchorMonth);
  if (count !== undefined && count !== null) params.set("count", String(count));
  const query = params.toString() ? `?${params.toString()}` : "";
  return await apiRequest(
    `/payroll/employee/${encodeURIComponent(employeeId)}/history${query}`
  );
};

/**
 * GET /api/payroll/:month/:employeeId
 * One employee's payroll record for one month.
 */
export const getPayrollApi = async (payrollMonth, employeeId) => {
  return await apiRequest(
    `/payroll/${encodeURIComponent(payrollMonth)}/${encodeURIComponent(employeeId)}`
  );
};

/**
 * GET /api/payroll/:month/locked
 * Whether a month is locked.
 */
export const isPayrollMonthLockedApi = async (payrollMonth) => {
  return await apiRequest(
    `/payroll/${encodeURIComponent(payrollMonth)}/locked`
  );
};

/**
 * POST /api/payroll/generate
 * Price a month (whole company or selected employees). All calculation
 * happens server-side; the response carries generated/skipped lists.
 */
export const generatePayrollApi = async ({
  payrollMonth,
  employeeIds = null,
  regenerate = false,
} = {}) => {
  return await apiRequest("/payroll/generate", {
    method: "POST",
    body: JSON.stringify({ payrollMonth, employeeIds, regenerate }),
  });
};

/**
 * POST /api/payroll/approve
 * Sign off a generated month.
 */
export const approvePayrollApi = async (payrollMonth) => {
  return await apiRequest("/payroll/approve", {
    method: "POST",
    body: JSON.stringify({ payrollMonth }),
  });
};

/**
 * POST /api/payroll/lock
 * Make an approved month final.
 */
export const lockPayrollApi = async (payrollMonth) => {
  return await apiRequest("/payroll/lock", {
    method: "POST",
    body: JSON.stringify({ payrollMonth }),
  });
};

/**
 * PATCH /api/payroll/:month/:employeeId/paid
 * Mark one record as paid.
 */
export const markPayrollPaidApi = async (payrollMonth, employeeId) => {
  return await apiRequest(
    `/payroll/${encodeURIComponent(payrollMonth)}/${encodeURIComponent(employeeId)}/paid`,
    { method: "PATCH" }
  );
};

/**
 * DELETE /api/payroll/:month/:employeeId
 * Remove one record (re-totals the run).
 */
export const deletePayrollApi = async (payrollMonth, employeeId) => {
  return await apiRequest(
    `/payroll/${encodeURIComponent(payrollMonth)}/${encodeURIComponent(employeeId)}`,
    { method: "DELETE" }
  );
};
