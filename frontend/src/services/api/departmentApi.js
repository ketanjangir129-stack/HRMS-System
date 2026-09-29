import { apiRequest } from "./apiClient";

// GET /api/departments/list?companyCode=... — poori list ek baar.
export const getDepartmentsApi = async (companyCode) => {
  return await apiRequest(
    `/departments/departmentslist?companyCode=${encodeURIComponent(companyCode)}`
  );
};

export const addDepartmentApi = async (companyCode, departmentName) => {
  return await apiRequest("/departments/adddepartment", {
    method: "POST",
    body: JSON.stringify({ companyCode, name: departmentName }),
  });
};
