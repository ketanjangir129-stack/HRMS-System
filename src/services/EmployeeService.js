import { db } from "../firebase/firebase";
import { ref, push } from "firebase/database";

// Add Employee
export const addEmployee = async (companyCode, employee) => {
  const employeeRef = ref(db, `companies/${companyCode}/employees`);
  await push(employeeRef, employee);
};

