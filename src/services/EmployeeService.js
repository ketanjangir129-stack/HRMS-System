import { db } from "../firebase/firebase";
import { ref, get, set, update } from "firebase/database";
 
// Add Employee
export const addEmployee = async (companyCode, employee) => {
  const employeeId = employee.employmentInfo.employeeId.trim().toUpperCase();
 
  await set(
    ref(db, `companies/${companyCode}/employees/${employeeId}`),
    {
      ...employee,
      employmentInfo:{
        ...employee.employmentInfo,
      employeeId,
     
    },
    account:{
      ...employee.account,
      status:"Active",
    },
     createdAt: Date.now(),
  }
);
};
 
 
// Get All Employees
export const getEmployees = async (companyCode) => {
  const snapshot = await get(
    ref(db, `companies/${companyCode}/employees`)
  );
 
  return snapshot.exists() ? snapshot.val() : {};
};
 
// Get Employee By ID
export const getEmployeeById = async (
  companyCode,
  employeeId
) => {
  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/employees/${employeeId.toUpperCase()}`
    )
  );
 
  return snapshot.exists() ? snapshot.val() : null;
};
 
 
// Update one section of an employee (e.g. { personalInfo: {...} })
export const updateEmployee = async (
  companyCode,
  employeeId,
  data
) => {
  await update(
    ref(
      db,
      `companies/${companyCode}/employees/${employeeId.toUpperCase()}`
    ),
    data
  );
};

// Check Duplicate Employee
export const checkEmployeeExists = async (
  companyCode,
  employee
) => {
  const employeeId = employee.employmentInfo.employeeId.trim().toUpperCase();
 
  // 1. Check Employee ID directly
  const employeeSnapshot = await get(
    ref(
      db,
      `companies/${companyCode}/employees/${employeeId}`
    )
  );
 
  if (employeeSnapshot.exists()) {
    return {
      success: false,
      field: "employeeId",
      message: "Employee ID already exists.",
    };
  }
 
  // 2. Check Email & Mobile
  const snapshot = await get(
    ref(db, `companies/${companyCode}/employees`)
  );
 
  if (snapshot.exists()) {
    const employees = snapshot.val();
 
    for (const key in employees) {
      const emp = employees[key];
 
      if (
        emp.personalInfo?.email?.toLowerCase() ===
        employee.personalInfo.email.trim().toLowerCase()
      ) {
        return {
          success: false,
          field: "email",
          message: "Email already exists.",
        };
      }
 
      if (emp.personalInfo?.mobile === employee.personalInfo.mobile.trim()) {
        return {
          success: false,
          field: "mobile",
          message: "Mobile number already exists.",
        };
      }
    }
  }
 
  return {
    success: true,
  };
};
 
// CREATE THE EMPLOYEES
export const createEmployee = async (
  companyCode,
  employee
) => {
  const result = await checkEmployeeExists(
    companyCode,
    employee
  );
 
  if (!result.success) {
    return result;
  }
 
  await addEmployee(companyCode, employee);
 
  return {
    success: true,
    message: "Employee created successfully.",
  };
};
 