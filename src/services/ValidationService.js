import { db } from "../firebase/firebase";
import { ref, get } from "firebase/database";

export const checkEmployeeUniqueness = async (
  companyCode,
  employee
) => {
  const employeeSnapshot = await get(
    ref(db, `companies/${companyCode}/employees`)
  );

  const onboardingSnapshot = await get(
    ref(db, `companies/${companyCode}/onboardingRequests`)
  );

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

 for (const record of records) {
  const details = record.basic || record;

  const employeeId = details.employeeId?.trim().toLowerCase();
  const email = details.email?.trim().toLowerCase();
  const mobile = details.mobile?.trim();

  if (
    employeeId &&
    employeeId === employee.employeeId.trim().toLowerCase()
  ) {
    return {
      success: false,
      field: "employeeId",
      message: "Employee ID already exists.",
    };
  }

  if (
    email &&
    email === employee.email.trim().toLowerCase()
  ) {
    return {
      success: false,
      field: "email",
      message: "Email already exists.",
    };
  }

  if (
    mobile &&
    mobile === employee.mobile.trim()
  ) {
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