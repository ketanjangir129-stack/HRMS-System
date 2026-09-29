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

export const addDesignationApi = async (companyCode, departmentId, designationName) => {
  return await apiRequest(`/departments/${departmentId}/adddesignation`, {
    method: "POST",
    body: JSON.stringify({ companyCode, name: designationName }),
  });
};

export const editDepartmentApi = async (companyCode, departmentId, departmentName) => {
  return await apiRequest(`/departments/${departmentId}/editdepartment`, {
    method: "PUT",
    body: JSON.stringify({ companyCode, name: departmentName }),
  });
};

export const editDesignationApi = async (companyCode, departmentId, designationId, designationName) => {
  return await apiRequest(`/departments/${departmentId}/${designationId}/editdesignation`, {
    method: "PUT",
    body: JSON.stringify({ companyCode, name: designationName }),
  });
};
