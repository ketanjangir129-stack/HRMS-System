import { apiRequest } from "./apiClient";

// POST /api/employees — backend duplicate check karke
// companies/{companyCode}/employees/{EMPLOYEE_ID} par record likhta hai.
export const createEmployeeApi = async (companyCode, employee) => {
  return await apiRequest("/employees", {
    method: "POST",
    body: JSON.stringify({ companyCode, employee }),
  });
};
