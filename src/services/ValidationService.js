import { db } from "../firebase/firebase";
import { ref, get } from "firebase/database";

export const checkEmployeeUniqueness = async (
  companyCode,
  employee
) => {
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

  const targetEmployeeId = employee.employeeId?.trim().toLowerCase();
  const targetEmail = employee.email?.trim().toLowerCase();
  const targetMobile = employee.mobile?.trim();

  for (const record of records) {
    const employment = record.employmentInfo || {};
    const personal = record.personalInfo || {};

    // employeeId always lives in employmentInfo.
    const employeeId = employment.employeeId?.trim().toLowerCase();

    // Active employees store contact in personalInfo; onboarding requests
    // store it in employmentInfo. Check both.
    const email = (personal.email || employment.email)
      ?.trim()
      .toLowerCase();
    const mobile = (personal.mobile || employment.mobile)?.trim();

    if (
      targetEmployeeId &&
      employeeId &&
      employeeId === targetEmployeeId
    ) {
      return {
        success: false,
        field: "employeeId",
        message: "Employee ID already exists.",
      };
    }

    if (targetEmail && email && email === targetEmail) {
      return {
        success: false,
        field: "email",
        message: "Email already exists.",
      };
    }

    if (targetMobile && mobile && mobile === targetMobile) {
      return {
        success: false,
        field: "mobile",
        message: "Mobile number already exists.",
      };
    }
  }

  return {
    success: true,
  };
};
