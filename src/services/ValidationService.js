import { db } from "../firebase/firebase";
import { ref, get } from "firebase/database";

/*
|--------------------------------------------------------------------------
| Identity index
|--------------------------------------------------------------------------
| The employee ids, emails and mobiles already spoken for, read once.
|
| A single on-boarding invite can afford to re-read the company on every
| check, but a bulk import of two hundred rows cannot: it would be two
| hundred reads of the same two lists. So the lookup is built once, handed
| around, and added to as records are written — which is also what stops a
| file from on-boarding the same person twice inside one run.
|--------------------------------------------------------------------------
*/

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export const buildEmployeeIdentityIndex = async (companyCode) => {

  // Check against both active employees and pending onboarding requests.
  const [employeeSnapshot, onboardingSnapshot] = await Promise.all([
    get(ref(db, `companies/${companyCode}/employees`)),
    get(ref(db, `companies/${companyCode}/onboardingRequests`)),
  ]);

  const employees = employeeSnapshot.exists()
    ? employeeSnapshot.val()
    : {};

  const requests = onboardingSnapshot.exists()
    ? onboardingSnapshot.val()
    : {};

  const records = [
    ...Object.values(employees),
    ...Object.values(requests),
  ];

  const index = {
    employeeIds: new Set(),
    emails: new Set(),
    mobiles: new Set(),
  };

  records.forEach((record) => {

    const employment = record.employmentInfo || {};
    const personal = record.personalInfo || {};

    // employeeId always lives in employmentInfo.
    // Active employees store contact in personalInfo; onboarding requests
    // store it in employmentInfo. Check both.
    addToIdentityIndex(index, {
      employeeId: employment.employeeId,
      email: personal.email || employment.email,
      mobile: personal.mobile || employment.mobile,
    });

  });

  return index;
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
