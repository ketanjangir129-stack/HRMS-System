import { getIdentityIndexApi } from "./api/onboardingApi";

/*
|--------------------------------------------------------------------------
| Identity index
|--------------------------------------------------------------------------
| The employee ids, emails and mobiles already spoken for.
| Fetched via the backend API rather than raw database reads.
|--------------------------------------------------------------------------
*/

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export const buildEmployeeIdentityIndex = async (companyCode) => {
  try {
    const data = await getIdentityIndexApi();
    return {
      employeeIds: new Set(data.employeeIds || []),
      emails: new Set(data.emails || []),
      mobiles: new Set(data.mobiles || []),
    };
  } catch (error) {
    console.error("Failed to fetch identity index from API:", error);
    return {
      employeeIds: new Set(),
      emails: new Set(),
      mobiles: new Set(),
    };
  }
};

export const addToIdentityIndex = (index, employee = {}) => {
  const employeeId = normalize(employee.employeeId);
  const email = normalize(employee.email);
  const mobile = normalize(employee.mobile);

  if (employeeId) index.employeeIds.add(employeeId);
  if (email) index.emails.add(email);
  if (mobile) index.mobiles.add(mobile);

  return index;
};

/*
| The first thing about this person that is already taken, or null when
| nothing is. The field is named so the form can put the message under the
| input it belongs to.
*/
export const findIdentityConflict = (index, employee = {}) => {
  const employeeId = normalize(employee.employeeId);
  const email = normalize(employee.email);
  const mobile = normalize(employee.mobile);

  if (employeeId && index.employeeIds.has(employeeId)) {
    return {
      field: "employeeId",
      message: "Employee ID already exists.",
    };
  }

  if (email && index.emails.has(email)) {
    return {
      field: "email",
      message: "Email already exists.",
    };
  }

  if (mobile && index.mobiles.has(mobile)) {
    return {
      field: "mobile",
      message: "Mobile number already exists.",
    };
  }

  return null;
};

export const checkEmployeeUniqueness = async (
  companyCode,
  employee
) => {
  const index = await buildEmployeeIdentityIndex(companyCode);
  const conflict = findIdentityConflict(index, employee);

  if (conflict) {
    return {
      success: false,
      ...conflict,
    };
  }

  return {
    success: true,
  };
};
