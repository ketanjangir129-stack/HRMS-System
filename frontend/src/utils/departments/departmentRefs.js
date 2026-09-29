/*
| Employees store employmentInfo.departmentId / designationId (push ids),
| never the names. Screens still work in names, so:
|   write → toDepartmentRefs    chosen names become ids
|   read  → withDepartmentNames ids are filled back in as
|                               employmentInfo.department / .designation
| Same as backend/src/utils/departmentRefs.js — change both.
*/

const toKey = (value) => String(value ?? "").trim().toLowerCase();

// Names are unique, so the lookup is exact. Unknown name → { error }.
export const toDepartmentRefs = (departments, departmentName, designationName) => {
  const departmentKey = toKey(departmentName);

  if (!departmentKey) {
    return { departmentId: "", designationId: "" };
  }

  const departmentEntry = Object.entries(departments || {}).find(
    ([, department]) => toKey(department?.name) === departmentKey
  );

  if (!departmentEntry) {
    return {
      error: { field: "department", message: "Department not found." },
    };
  }

  const [departmentId, department] = departmentEntry;
  const designationKey = toKey(designationName);

  if (!designationKey) {
    return { departmentId, designationId: "" };
  }

  const designationEntry = Object.entries(department?.designations || {}).find(
    ([, designation]) => toKey(designation?.name) === designationKey
  );

  if (!designationEntry) {
    return {
      error: { field: "designation", message: "Designation not found." },
    };
  }

  return { departmentId, designationId: designationEntry[0] };
};

// Ids → names. A deleted department or designation reads as "".
export const withDepartmentNames = (record, departments) => {
  if (!record?.employmentInfo) return record;

  const { departmentId, designationId } = record.employmentInfo;
  const department = departments?.[departmentId];

  return {
    ...record,
    employmentInfo: {
      ...record.employmentInfo,
      department: department?.name || "",
      designation: department?.designations?.[designationId]?.name || "",
    },
  };
};

export const withDepartmentNamesAll = (employees, departments) =>
  Object.fromEntries(
    Object.entries(employees || {}).map(([employeeId, record]) => [
      employeeId,
      withDepartmentNames(record, departments),
    ])
  );
