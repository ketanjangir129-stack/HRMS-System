import { apiRequest } from "./apiClient";

// POST /api/employees/create — backend duplicate check karke
// companies/{companyCode}/employees/{EMPLOYEE_ID} par record likhta hai.
export const createEmployeeApi = async (companyCode, employee) => {
  return await apiRequest("/employees/create", {
    method: "POST",
    body: JSON.stringify({ companyCode, employee }),
  });
};

// GET /api/employees/list?companyCode=... — poori list ek baar.
export const getEmployeesApi = async (companyCode) => {
  return await apiRequest(
    `/employees/list?companyCode=${encodeURIComponent(companyCode)}`
  );
};
