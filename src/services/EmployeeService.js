import { db } from "../firebase/firebase";
import { ref, push,get } from "firebase/database";

// Add Employee
export const addEmployee = async (companyCode, employee) => {
  const employeeRef = ref(db, `companies/${companyCode}/employees`);
  await push(employeeRef, employee);
};

// CHECK EMPLOYEE DETAILS
export const checkEmployeeExists = async (
  companyCode,
  employee
) => {
  const snapshot = await get(
    ref(db, `companies/${companyCode}/employees`)
  );

  if (!snapshot.exists()) {
    return {
      exists: false,
    };
  }

  const employees = snapshot.val();

  for (const key in employees) {
    const emp = employees[key];

    if (
      emp.employeeId.toLowerCase() ===
      employee.employeeId.toLowerCase()
    ) {
      return {
        exists: true,
        field: "employeeId",
        message: "Employee ID already exists.",
      };
    }

    if (
      emp.email.toLowerCase() ===
      employee.email.toLowerCase()
    ) {
      return {
        exists: true,
        field: "email",
        message: "Email already exists.",
      };
    }

    if (emp.mobile === employee.mobile) {
      return {
        exists: true,
        field: "mobile",
        message: "Mobile number already exists.",
      };
    }
  }

  return {
    exists: false,
  };
};

export const createEmployee = async (companyCode, employee) => {
  const duplicate = await checkEmployeeExists(companyCode, employee);

  if (duplicate.exists) {
    return duplicate;
  }

  await addEmployee(companyCode, employee);

  return {
    success: true,
  };
};